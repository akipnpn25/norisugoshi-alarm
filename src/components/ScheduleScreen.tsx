"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  Clock,
  Coffee,
  MapPin,
  Pencil,
  Plus,
  Power,
  SkipForward,
  Trash2,
  TrainFront,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { TimeWheelPicker } from "@/src/components/TimeWheelPicker";
import {
  BREAK_DURATION_OPTIONS,
  DEFAULT_WAKE_STYLE_ID,
  LEAD_TIMES,
  WAKE_STYLES,
} from "@/src/lib/data";
import {
  getNextOccurrenceForSchedule,
  getRepeatLabel,
  isScheduleNormallyForDate,
  toLocalDateKey,
} from "@/src/lib/schedule-storage";
import { formatTimeWithDay } from "@/src/lib/time";
import type {
  BreakRecurringSchedule,
  LeadTimeId,
  RecurringSchedule,
  RepeatPattern,
  SetupMode,
  Station,
  TransitRecurringSchedule,
  WakeStyleId,
  Weekday,
} from "@/src/lib/types";

interface TransitScheduleDefaults {
  station: Station | null;
  arrivalHour: number;
  arrivalMinute: number;
  leadTimeId: LeadTimeId;
  wakeStyleId: WakeStyleId;
}

interface BreakScheduleDefaults {
  durationMinutes: number;
  warningEnabled: boolean;
  wakeStyleId: WakeStyleId;
}

interface ScheduleScreenProps {
  schedules: RecurringSchedule[];
  stations: Station[];
  defaultMode: SetupMode;
  transitDefaults: TransitScheduleDefaults;
  breakDefaults: BreakScheduleDefaults;
  onSave: (schedule: RecurringSchedule) => void;
  onDelete: (scheduleId: string) => void;
  onToggleEnabled: (scheduleId: string) => void;
  onToggleTodaySkip: (scheduleId: string) => void;
  onClose: () => void;
}

interface ScheduleDraft {
  id: string | null;
  mode: SetupMode;
  enabled: boolean;
  repeatPattern: RepeatPattern;
  weekdays: Weekday[];
  stationId: string;
  arrivalTime: string;
  leadTimeId: LeadTimeId;
  startTime: string;
  durationMinutes: string;
  warningEnabled: boolean;
  wakeStyleId: WakeStyleId;
  skippedDates: string[];
  createdAt: string | null;
}

const WEEKDAYS: {
  id: Weekday;
  label: string;
}[] = [
  { id: 0, label: "日" },
  { id: 1, label: "月" },
  { id: 2, label: "火" },
  { id: 3, label: "水" },
  { id: 4, label: "木" },
  { id: 5, label: "金" },
  { id: 6, label: "土" },
];

const DEFAULT_CUSTOM_WEEKDAYS: Weekday[] = [];

function toTimeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function parseTimeValue(value: string): {
  hour: number;
  minute: number;
} | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function getWeekdaysForPattern(
  repeatPattern: RepeatPattern,
  weekdays: Weekday[]
): Weekday[] {
  if (repeatPattern === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (repeatPattern === "weekdays") {
    return [1, 2, 3, 4, 5];
  }

  return weekdays.length > 0
    ? [...weekdays].sort((a, b) => a - b)
    : [...DEFAULT_CUSTOM_WEEKDAYS];
}

export function ScheduleScreen({
  schedules,
  stations,
  defaultMode,
  transitDefaults,
  breakDefaults,
  onSave,
  onDelete,
  onToggleEnabled,
  onToggleTodaySkip,
  onClose,
}: ScheduleScreenProps) {
  const [editing, setEditing] =
    useState<ScheduleDraft | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const todayKey = toLocalDateKey(now);

  const stationOptions = useMemo(() => {
    const map = new Map<string, Station>();

    stations.forEach((station) =>
      map.set(station.id, station)
    );

    schedules.forEach((schedule) => {
      if (schedule.mode === "transit") {
        map.set(schedule.station.id, schedule.station);
      }
    });

    if (transitDefaults.station) {
      map.set(
        transitDefaults.station.id,
        transitDefaults.station
      );
    }

    return Array.from(map.values());
  }, [schedules, stations, transitDefaults.station]);

  const openNewSchedule = () => {
    const nowForTime = new Date();
    nowForTime.setMinutes(nowForTime.getMinutes() + 5);
    nowForTime.setSeconds(0, 0);

    setEditing({
      id: null,
      mode: defaultMode,
      enabled: true,
      repeatPattern: "weekdays",
      weekdays: [...DEFAULT_CUSTOM_WEEKDAYS],
      stationId:
        transitDefaults.station?.id ??
        stationOptions[0]?.id ??
        "",
      arrivalTime: toTimeValue(
        transitDefaults.arrivalHour,
        transitDefaults.arrivalMinute
      ),
      leadTimeId: transitDefaults.leadTimeId,
      startTime: toTimeValue(
        nowForTime.getHours(),
        nowForTime.getMinutes()
      ),
      durationMinutes: String(
        breakDefaults.durationMinutes
      ),
      warningEnabled: breakDefaults.warningEnabled,
      wakeStyleId:
        defaultMode === "break"
          ? breakDefaults.wakeStyleId
          : transitDefaults.wakeStyleId,
      skippedDates: [],
      createdAt: null,
    });
  };

  const openExistingSchedule = (
    schedule: RecurringSchedule
  ) => {
    setEditing({
      id: schedule.id,
      mode: schedule.mode,
      enabled: schedule.enabled,
      repeatPattern: schedule.repeatPattern,
      weekdays: [...schedule.weekdays],
      stationId:
        schedule.mode === "transit"
          ? schedule.station.id
          : transitDefaults.station?.id ??
            stationOptions[0]?.id ??
            "",
      arrivalTime:
        schedule.mode === "transit"
          ? toTimeValue(
              schedule.arrivalHour,
              schedule.arrivalMinute
            )
          : toTimeValue(
              transitDefaults.arrivalHour,
              transitDefaults.arrivalMinute
            ),
      leadTimeId:
        schedule.mode === "transit"
          ? schedule.leadTimeId
          : transitDefaults.leadTimeId,
      startTime:
        schedule.mode === "break"
          ? toTimeValue(
              schedule.startHour,
              schedule.startMinute
            )
          : toTimeValue(
              new Date().getHours(),
              new Date().getMinutes()
            ),
      durationMinutes:
        schedule.mode === "break"
          ? String(schedule.durationMinutes)
          : String(breakDefaults.durationMinutes),
      warningEnabled:
        schedule.mode === "break"
          ? schedule.warningEnabled
          : breakDefaults.warningEnabled,
      wakeStyleId: schedule.wakeStyleId,
      skippedDates: [...schedule.skippedDates],
      createdAt: schedule.createdAt,
    });
  };

  const saveDraft = (draft: ScheduleDraft) => {
    const timestamp = new Date().toISOString();
    const base = {
      id: draft.id ?? crypto.randomUUID(),
      enabled: draft.enabled,
      repeatPattern: draft.repeatPattern,
      weekdays: getWeekdaysForPattern(
        draft.repeatPattern,
        draft.weekdays
      ),
      skippedDates: draft.skippedDates,
      createdAt: draft.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    if (draft.mode === "transit") {
      const station = stationOptions.find(
        (item) => item.id === draft.stationId
      );
      const arrival = parseTimeValue(
        draft.arrivalTime
      );

      if (!station || !arrival) return;

      const schedule: TransitRecurringSchedule = {
        ...base,
        mode: "transit",
        station,
        arrivalHour: arrival.hour,
        arrivalMinute: arrival.minute,
        leadTimeId: draft.leadTimeId,
        wakeStyleId: draft.wakeStyleId,
      };

      onSave(schedule);
      setEditing(null);
      return;
    }

    const start = parseTimeValue(draft.startTime);
    const durationMinutes = Number.parseInt(
      draft.durationMinutes,
      10
    );

    if (
      !start ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 240
    ) {
      return;
    }

    const schedule: BreakRecurringSchedule = {
      ...base,
      mode: "break",
      startHour: start.hour,
      startMinute: start.minute,
      durationMinutes,
      warningEnabled:
        draft.warningEnabled && durationMinutes > 5,
      wakeStyleId: draft.wakeStyleId,
    };

    onSave(schedule);
    setEditing(null);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all active:scale-95"
          aria-label="アラーム設定へ戻る"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
            <CalendarClock
              className="text-moon"
              size={27}
            />
            繰り返し予定
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            毎日・平日・曜日ごとの設定を登録できます。
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={openNewSchedule}
        className="mt-5 w-full"
      >
        <Plus size={19} className="mr-2" />
        新しい予定を追加
      </Button>

      <Card className="mt-4 border-moon/30 bg-moon/10 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Web版では、画面を閉じたり端末をロックしたりすると、
          予定時刻に自動実行されない場合があります。予定一覧を
          確認し、利用中はアプリを開いたままにしてください。
        </p>
      </Card>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-moon/10 text-moon">
            <CalendarClock size={31} />
          </span>
          <p className="mt-4 text-base font-extrabold text-foreground">
            予定はまだありません
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            よく使う電車や休憩の設定を、
            繰り返し予定として登録できます。
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {schedules.map((schedule) => {
            const occurrence =
              getNextOccurrenceForSchedule(
                schedule,
                now
              );
            const normallyToday =
              isScheduleNormallyForDate(
                schedule,
                now
              );
            const skippedToday =
              schedule.skippedDates.includes(todayKey);

            return (
              <Card
                key={schedule.id}
                className={`p-0 ${
                  schedule.enabled
                    ? "bg-card"
                    : "bg-card opacity-60"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
                      {schedule.mode === "transit" ? (
                        <TrainFront size={21} />
                      ) : (
                        <Coffee size={21} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold text-foreground">
                            {schedule.mode === "transit"
                              ? schedule.station.name
                              : `${schedule.durationMinutes}分休憩`}
                          </p>
                          <p className="mt-1 text-xs font-bold text-moon">
                            {schedule.mode === "transit"
                              ? `到着 ${toTimeValue(
                                  schedule.arrivalHour,
                                  schedule.arrivalMinute
                                )}・${
                                  LEAD_TIMES.find(
                                    (item) =>
                                      item.id ===
                                      schedule.leadTimeId
                                  )?.label ?? "5分前"
                                }`
                              : `開始 ${toTimeValue(
                                  schedule.startHour,
                                  schedule.startMinute
                                )}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onToggleEnabled(schedule.id)
                          }
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                            schedule.enabled
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-border bg-night-surface text-muted-foreground"
                          }`}
                          aria-label={
                            schedule.enabled
                              ? "予定を無効にする"
                              : "予定を有効にする"
                          }
                        >
                          <Power size={17} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-night-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                          {getRepeatLabel(schedule)}
                        </span>
                        <span className="rounded-full bg-night-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                          {
                            WAKE_STYLES.find(
                              (style) =>
                                style.id ===
                                schedule.wakeStyleId
                            )?.label
                          }
                        </span>
                        {schedule.mode === "break" &&
                          schedule.warningEnabled && (
                            <span className="rounded-full bg-night-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                              5分前予告
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-night-surface/60 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        次回
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {!schedule.enabled
                          ? "無効"
                          : occurrence
                            ? formatTimeWithDay(
                                occurrence.triggerAt,
                                now
                              )
                            : "予定なし"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {normallyToday ? (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleTodaySkip(schedule.id)
                        }
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                          skippedToday
                            ? "border-moon bg-moon/10 text-moon"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {skippedToday ? (
                          <Check size={15} />
                        ) : (
                          <SkipForward size={15} />
                        )}
                        {skippedToday
                          ? "スキップ解除"
                          : "今日だけスキップ"}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-border px-3 py-2.5 text-center text-xs font-bold text-muted-foreground/60">
                        今日は対象外
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openExistingSchedule(schedule)
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-muted-foreground transition-all active:scale-[0.98]"
                    >
                      <Pencil size={15} />
                      編集
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm(
                        "この繰り返し予定を削除しますか？"
                      );

                      if (ok) {
                        onDelete(schedule.id);
                      }
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/10"
                  >
                    <Trash2 size={15} />
                    予定を削除
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <ScheduleEditorModal
          draft={editing}
          stations={stationOptions}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => saveDraft(editing)}
        />
      )}
    </div>
  );
}

function ScheduleEditorModal({
  draft,
  stations,
  onChange,
  onClose,
  onSave,
}: {
  draft: ScheduleDraft;
  stations: Station[];
  onChange: (draft: ScheduleDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const durationMinutes = Number.parseInt(
    draft.durationMinutes,
    10
  );
  const validDuration =
    Number.isInteger(durationMinutes) &&
    durationMinutes >= 1 &&
    durationMinutes <= 240;
  const valid =
    draft.repeatPattern !== "custom" ||
    draft.weekdays.length > 0;
  const modeValid =
    draft.mode === "transit"
      ? Boolean(
          draft.stationId &&
            parseTimeValue(draft.arrivalTime)
        )
      : Boolean(
          parseTimeValue(draft.startTime) &&
            validDuration
        );

  const setMode = (mode: SetupMode) => {
    onChange({
      ...draft,
      mode,
      wakeStyleId:
        draft.wakeStyleId ??
        DEFAULT_WAKE_STYLE_ID,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-night-deep/80 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-moon/30 bg-night-card p-5 shadow-2xl animate-scale-in sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-editor-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="schedule-editor-title"
              className="text-xl font-extrabold text-foreground"
            >
              {draft.id
                ? "予定を編集"
                : "新しい予定"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              時刻と繰り返す曜日を設定します。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <EditorLabel
          text="種類"
          icon={<CalendarClock size={16} />}
        />
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            selected={draft.mode === "transit"}
            icon={<TrainFront size={18} />}
            label="電車"
            onClick={() => setMode("transit")}
          />
          <ModeButton
            selected={draft.mode === "break"}
            icon={<Coffee size={18} />}
            label="休憩"
            onClick={() => setMode("break")}
          />
        </div>

        <EditorLabel
          text="繰り返し"
          icon={<CalendarClock size={16} />}
        />
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["daily", "毎日"],
              ["weekdays", "平日"],
              ["custom", "曜日指定"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  repeatPattern: id,
                  weekdays:
                    id === "custom" &&
                    draft.repeatPattern !== "custom"
                      ? []
                      : draft.weekdays,
                })
              }
              className={`rounded-2xl border px-2 py-3 text-xs font-extrabold transition-all active:scale-95 ${
                draft.repeatPattern === id
                  ? "border-moon bg-moon text-night-deep"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {draft.repeatPattern === "custom" && (
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => {
              const selected =
                draft.weekdays.includes(day.id);

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => {
                    const weekdays = selected
                      ? draft.weekdays.filter(
                          (item) => item !== day.id
                        )
                      : [...draft.weekdays, day.id];

                    onChange({
                      ...draft,
                      weekdays,
                    });
                  }}
                  className={`flex aspect-square items-center justify-center rounded-full border text-xs font-extrabold transition-all active:scale-95 ${
                    selected
                      ? "border-moon bg-moon text-night-deep"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}

        {draft.mode === "transit" ? (
          <>
            <EditorLabel
              text="目的地"
              icon={<MapPin size={16} />}
            />
            <select
              value={draft.stationId}
              onChange={(event) =>
                onChange({
                  ...draft,
                  stationId: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-border bg-night-deep/60 px-4 py-3.5 text-base font-bold text-foreground outline-none focus:border-moon"
            >
              <option value="">目的地を選択</option>
              {stations.map((station) => (
                <option
                  key={station.id}
                  value={station.id}
                >
                  {station.name}
                </option>
              ))}
            </select>

            <EditorLabel
              text="到着予定時刻"
              icon={<Clock size={16} />}
            />
            <TimeWheelPicker
              hour={
                parseTimeValue(draft.arrivalTime)?.hour ?? 0
              }
              minute={
                parseTimeValue(draft.arrivalTime)?.minute ?? 0
              }
              label="到着予定時刻"
              editorTitle="到着時刻を設定"
              onComplete={(hour, minute) =>
                onChange({
                  ...draft,
                  arrivalTime: toTimeValue(hour, minute),
                })
              }
            />

            <EditorLabel
              text="起こすタイミング"
              icon={<Bell size={16} />}
            />
            <div className="grid grid-cols-3 gap-2">
              {LEAD_TIMES.map((leadTime) => (
                <button
                  key={leadTime.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      leadTimeId: leadTime.id,
                    })
                  }
                  className={`rounded-2xl border px-2 py-3 text-sm font-extrabold transition-all active:scale-95 ${
                    draft.leadTimeId ===
                    leadTime.id
                      ? "border-moon bg-moon text-night-deep"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {leadTime.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <EditorLabel
              text="休憩開始時刻"
              icon={<Clock size={16} />}
            />
            <TimeWheelPicker
              hour={
                parseTimeValue(draft.startTime)?.hour ?? 0
              }
              minute={
                parseTimeValue(draft.startTime)?.minute ?? 0
              }
              label="休憩開始時刻"
              editorTitle="開始時刻を設定"
              onComplete={(hour, minute) =>
                onChange({
                  ...draft,
                  startTime: toTimeValue(hour, minute),
                })
              }
            />

            <EditorLabel
              text="休憩時間"
              icon={<Coffee size={16} />}
            />
            <div className="grid grid-cols-4 gap-2">
              {BREAK_DURATION_OPTIONS.map(
                (minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...draft,
                        durationMinutes:
                          String(minutes),
                        warningEnabled:
                          minutes > 5
                            ? draft.warningEnabled
                            : false,
                      })
                    }
                    className={`rounded-2xl border px-2 py-3 text-sm font-extrabold transition-all active:scale-95 ${
                      durationMinutes === minutes
                        ? "border-moon bg-moon text-night-deep"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {minutes}分
                  </button>
                )
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <span className="flex-1 text-sm font-bold text-foreground">
                自由設定
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="240"
                value={draft.durationMinutes}
                onChange={(event) => {
                  const minutes = Number.parseInt(
                    event.target.value,
                    10
                  );

                  onChange({
                    ...draft,
                    durationMinutes:
                      event.target.value,
                    warningEnabled:
                      Number.isInteger(minutes) &&
                      minutes <= 5
                        ? false
                        : draft.warningEnabled,
                  });
                }}
                className="w-20 rounded-xl border border-border bg-night-deep/60 px-3 py-2 text-right font-extrabold text-foreground outline-none focus:border-moon"
              />
              <span className="text-sm font-bold text-muted-foreground">
                分
              </span>
            </div>

            {!validDuration && (
              <p className="mt-2 text-xs text-destructive">
                1〜240分の範囲で設定してください。
              </p>
            )}

            <EditorLabel
              text="終了5分前の予告"
              icon={<Bell size={16} />}
            />
            <button
              type="button"
              disabled={!validDuration || durationMinutes <= 5}
              onClick={() =>
                onChange({
                  ...draft,
                  warningEnabled:
                    !draft.warningEnabled,
                })
              }
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left disabled:opacity-45"
            >
              <span className="flex-1">
                <span className="block text-sm font-extrabold text-foreground">
                  5分前に予告する
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  休憩の終了が近いことを知らせます
                </span>
              </span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  draft.warningEnabled &&
                  validDuration &&
                  durationMinutes > 5
                    ? "bg-moon"
                    : "bg-night-surface"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    draft.warningEnabled &&
                    validDuration &&
                    durationMinutes > 5
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </>
        )}

        <EditorLabel
          text="起こし方"
          icon={<Bell size={16} />}
        />
        <div className="flex flex-col gap-2">
          {WAKE_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  wakeStyleId: style.id,
                })
              }
              className={`rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                draft.wakeStyleId === style.id
                  ? "border-moon bg-moon/15"
                  : "border-border bg-card"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-extrabold text-foreground">
                    {style.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {style.description}
                  </span>
                </span>
                {draft.wakeStyleId === style.id && (
                  <Check
                    size={18}
                    className="shrink-0 text-moon"
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            disabled={!valid || !modeValid}
            onClick={onSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditorLabel({
  text,
  icon,
}: {
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 text-sm font-extrabold text-foreground">
      {icon}
      {text}
    </div>
  );
}

function ModeButton({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 text-sm font-extrabold transition-all active:scale-95 ${
        selected
          ? "border-moon bg-moon text-night-deep"
          : "border-border bg-card text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
