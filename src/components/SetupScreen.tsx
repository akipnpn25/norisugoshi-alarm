"use client";

import { useState } from "react";
import {
  Moon,
  Bookmark,
  Clock,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { HeadphoneCheckCard } from "@/src/components/HeadphoneCheckCard";
import { TimeWheelPicker } from "@/src/components/TimeWheelPicker";
import {
  LEAD_TIMES,
  TRANSIT_ARRIVAL_LEAD_TIME,
  WAKE_STYLES,
} from "@/src/lib/data";
import type {
  AlarmInput,
  TransitQuickSetting,
  WakeStyleId,
} from "@/src/lib/types";
import {
  getAdaptiveAlarmTime,
  type AdaptiveAlarmPlan,
} from "@/src/lib/recommendation";
import {
  calculateAlarmTime,
  formatTime,
  formatTimeWithDay,
  isFuture,
} from "@/src/lib/time";

interface SetupScreenProps {
  input: AlarmInput;
  onInputChange: (patch: Partial<AlarmInput>) => void;
  onWakeStyleChange: (wakeStyleId: WakeStyleId) => void;
  earphoneChecked: boolean;
  earphoneConnected: boolean;
  routeName: string;
  alarmSoundLabel: string;
  quickSettings: TransitQuickSetting[];
  selectedQuickSettingId: string | null;
  onApplyQuickSetting: (setting: TransitQuickSetting) => void;
  adaptiveAlarmPlan: AdaptiveAlarmPlan;
  adaptivePlanLoading: boolean;
  adaptiveAlarmEnabled: boolean;
  onSetAlarm: () => void;
  onHeadphoneCheckStart?: () => void;
  onHeadphoneCheckEnd: (connected: boolean, name: string, error: string | null) => void;
}

export function SetupScreen({
  input,
  onInputChange,
  onWakeStyleChange,
  earphoneChecked,
  earphoneConnected,
  routeName,
  alarmSoundLabel,
  quickSettings,
  selectedQuickSettingId,
  onApplyQuickSetting,
  adaptiveAlarmPlan,
  adaptivePlanLoading,
  adaptiveAlarmEnabled,
  onSetAlarm,
  onHeadphoneCheckStart,
  onHeadphoneCheckEnd,
}: SetupScreenProps) {
  const [choosingWakeStyle, setChoosingWakeStyle] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const availableLeadTimes =
    input.leadTimeId === TRANSIT_ARRIVAL_LEAD_TIME.id
      ? [TRANSIT_ARRIVAL_LEAD_TIME, ...LEAD_TIMES]
      : LEAD_TIMES;
  const leadTime =
    availableLeadTimes.find((l) => l.id === input.leadTimeId) ??
    LEAD_TIMES[1];
  const baseAlarmTime = calculateAlarmTime(
    input.arrivalTime,
    leadTime
  );
  const adaptiveTiming = getAdaptiveAlarmTime(
    baseAlarmTime,
    adaptiveAlarmPlan
  );
  const alarmTime = adaptiveTiming.alarmTime;
  const wakeStyle =
    WAKE_STYLES.find((style) => style.id === input.wakeStyleId) ??
    WAKE_STYLES[1];
  const hoursUntilArrival =
    (input.arrivalTime.getTime() - Date.now()) / 3600000;
  const isLongWait = hoursUntilArrival > 6;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isArrivalTomorrow =
    input.arrivalTime.getFullYear() === tomorrow.getFullYear() &&
    input.arrivalTime.getMonth() === tomorrow.getMonth() &&
    input.arrivalTime.getDate() === tomorrow.getDate();

  const ready = isFuture(alarmTime);
  const destinationName = input.station?.name.trim() ?? "";

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <Moon className="text-moon" size={28} />
          アラームをセット
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          疲れているあなたへ。数タップで安心の仮眠を。
        </p>
      </div>

      {/* いつもの移動 */}
      {quickSettings.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Bookmark size={17} className="text-moon" />
            マイ設定
          </div>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {quickSettings.map((setting) => {
              const selected = setting.id === selectedQuickSettingId;

              return (
                <button
                  key={setting.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onApplyQuickSetting(setting)}
                  className={`min-w-[150px] shrink-0 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
                    selected
                      ? "border-moon bg-moon shadow-lg shadow-moon/20 ring-2 ring-moon/30"
                      : "border-moon/30 bg-moon/10"
                  }`}
                >
                  <span
                    className={`block truncate text-[15px] font-extrabold ${
                      selected ? "text-night-deep" : "text-foreground"
                    }`}
                  >
                    {setting.name}
                  </span>
                  {setting.station.name.trim() && (
                    <span
                      className={`mt-1 block truncate text-xs font-bold ${
                        selected ? "text-night-deep/80" : "text-moon"
                      }`}
                    >
                      {setting.station.name}
                    </span>
                  )}
                  <span
                    className={`mt-1 block text-[11px] ${
                      selected
                        ? "font-bold text-night-deep/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {String(setting.arrivalHour).padStart(2, "0")}:{String(
                      setting.arrivalMinute
                    ).padStart(2, "0")}到着用
                  </span>
                  {selected && (
                    <span className="mt-2 inline-flex rounded-full bg-night-deep/15 px-2 py-1 text-[10px] font-extrabold text-night-deep">
                      {isArrivalTomorrow ? "明日の設定を適用中" : "選択中"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 1. 到着予定時刻 */}
      <SectionLabel num="1" text="到着予定時刻" icon={<Clock size={16} />} />
      <TimeWheelPicker
        hour={input.arrivalTime.getHours()}
        minute={input.arrivalTime.getMinutes()}
        onComplete={(h, m) => {
          const now = new Date();
          const newDate = new Date();

          newDate.setHours(h, m, 0, 0);

          // 選んだ時刻が現在以前なら、翌日の時刻として扱う
          if (newDate.getTime() <= now.getTime()) {
            newDate.setDate(newDate.getDate() + 1);
          }

          onInputChange({ arrivalTime: newDate });
        }}
      />

      {isArrivalTomorrow && (
        <p className="mt-2 text-center text-sm font-bold text-moon">
          明日 {formatTime(input.arrivalTime)}として設定します
        </p>
      )}

      {/* 2. 起こすタイミング */}
      <SectionLabel num="2" text="起こすタイミング" icon={<Bell size={16} />} />
      <div className="flex gap-2.5">
        {availableLeadTimes.map((l) => {
          const selected = l.id === input.leadTimeId;
          return (
            <button
              key={l.id}
              onClick={() => onInputChange({ leadTimeId: l.id })}
              className={`flex-1 rounded-2xl border py-4 text-[15px] font-bold transition-all active:scale-95 ${
                selected
                  ? "border-moon bg-moon text-night-deep"
                  : "border-border bg-card text-foreground hover:bg-night-surface"
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      <Card className="mt-3 border-moon/30 bg-moon/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <Sparkles
            size={21}
            className="mt-0.5 shrink-0 text-moon"
          />
          <div>
            <p className="text-sm font-extrabold text-foreground">
              スマート調整
            </p>
            {!adaptiveAlarmEnabled ? (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                オフです。反応がない場合は、標準の30秒後・90秒後に
                段階的に強くします。
              </p>
            ) : adaptivePlanLoading ? (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                過去の反応を確認しています。
              </p>
            ) : adaptiveAlarmPlan.personalized ? (
              <>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  過去{adaptiveAlarmPlan.sampleCount}回の反応から、
                  {adaptiveTiming.appliedExtraLeadMinutes > 0
                    ? `今回は選んだ時刻より${adaptiveTiming.appliedExtraLeadMinutes}分早く開始します。`
                    : adaptiveAlarmPlan.extraLeadMinutes > 0
                      ? "開始時刻が近いため、今回は早め調整を行いません。"
                      : "今回は選んだ起床時刻から開始します。"}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  反応がなければ
                  {Math.round(
                    adaptiveAlarmPlan.stageTwoDelayMs / 1000
                  )}
                  秒後、
                  {Math.round(
                    adaptiveAlarmPlan.stageThreeDelayMs / 1000
                  )}
                  秒後に段階的に強くします。
                </p>
              </>
            ) : (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                反応記録が3回たまるまでは、標準の30秒後・90秒後に
                強くします。現在{adaptiveAlarmPlan.sampleCount}/3回です。
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 3. 詳細設定 */}
      <SectionLabel num="3" text="詳細設定" icon={<Bell size={16} />} />
      <Card className="bg-card p-0">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center gap-3 px-4 py-4 text-left"
          aria-expanded={detailsOpen}
        >
          <span className="flex-1">
            <span className="block text-base font-extrabold text-foreground">
              起こし方：{wakeStyle.label}
            </span>
            <span className="mt-1 block text-[12px] text-muted-foreground">
              アラーム音：{alarmSoundLabel}
            </span>
            <span className="mt-1 block text-[12px] text-muted-foreground">
              音の出力先：
              {!earphoneChecked
                ? "未確認"
                : earphoneConnected
                  ? routeName || "イヤホン"
                  : routeName || "本体スピーカー"}
            </span>
          </span>
          <span className="flex items-center gap-1 text-[12px] font-bold text-moon">
            {detailsOpen ? "閉じる" : "確認・変更"}
            {detailsOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </span>
        </button>

        {detailsOpen && (
          <div className="border-t border-border px-3 pb-4 pt-3">
            <p className="px-1 text-sm font-extrabold text-foreground">
              起こし方
            </p>
            <button
              type="button"
              onClick={() => setChoosingWakeStyle((open) => !open)}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-border bg-night-surface/40 px-4 py-3 text-left"
              aria-expanded={choosingWakeStyle}
            >
              <span className="flex-1">
                <span className="block text-[15px] font-extrabold text-foreground">
                  {wakeStyle.label}
                </span>
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  {wakeStyle.description}
                </span>
              </span>
              {choosingWakeStyle ? (
                <ChevronUp size={16} className="text-moon" />
              ) : (
                <ChevronDown size={16} className="text-moon" />
              )}
            </button>

            {choosingWakeStyle && (
              <div className="pb-1">
                {WAKE_STYLES.map((style) => {
                  const selected = style.id === input.wakeStyleId;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        onWakeStyleChange(style.id);
                        setChoosingWakeStyle(false);
                      }}
                      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                        selected
                          ? "border-moon bg-moon/15"
                          : "border-border bg-night-surface/50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-[15px] font-extrabold text-foreground">
                            {style.label}
                          </span>
                          <span className="mt-1 block text-[12px] text-muted-foreground">
                            {style.description}
                          </span>
                        </span>
                        {selected && (
                          <span className="shrink-0 text-xs font-bold text-moon">
                            選択中
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-2 px-1 text-xs text-muted-foreground">
              前回選んだ起こし方を次回も自動で使用します。
            </p>

            <div className="my-4 h-px bg-border" />
            <p className="mb-2 px-1 text-sm font-extrabold text-foreground">
              音の出力先を確認（任意）
            </p>
            <HeadphoneCheckCard
              checked={earphoneChecked}
              connected={earphoneConnected}
              routeName={routeName}
              onCheckStart={onHeadphoneCheckStart}
              onCheckEnd={onHeadphoneCheckEnd}
            />
          </div>
        )}
      </Card>

      <Card className="mt-3 border-moon/30 bg-moon/10 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          このWeb版は、端末をロックしたり別のアプリへ移動したりすると、
          予定時刻に鳴らない場合があります。利用中はこの画面を
          開いたままにしてください。
        </p>
      </Card>

      {/* 4. 計算された起床時刻（概要） */}
      <SectionLabel num="4" text="起床時刻" />
      <Card className="bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">起床時刻</span>
          <span className="text-2xl font-extrabold tabular-nums text-moon">
            {formatTimeWithDay(alarmTime)}
          </span>
        </div>
        {destinationName && (
          <>
            <div className="my-3.5 h-px bg-border" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">目的地</span>
              <span className="font-bold text-foreground">
                {destinationName}
              </span>
            </div>
          </>
        )}
      </Card>

      {isLongWait && (
        <p className="mt-5 rounded-2xl border border-moon/30 bg-moon/10 px-4 py-3 text-center text-sm font-bold text-moon">
          ⚠ 到着まで{Math.floor(hoursUntilArrival)}時間あります。
          明日の時刻で合っていますか？
        </p>
      )}

      <Button
        onClick={onSetAlarm}
        disabled={!ready}
        size="lg"
        className="mt-5 w-full"
      >
        アラームをセット
      </Button>
      {!ready && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          起床時刻が過ぎています。到着時刻か起こすタイミングを変更してください
        </p>
      )}
    </div>
  );
}

function SectionLabel({
  num,
  text,
  icon,
}: {
  num: string;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2.5">
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-moon text-[13px] font-extrabold text-night-deep">
        {num}
      </div>
      <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
        {icon}
        {text}
      </span>
    </div>
  );
}
