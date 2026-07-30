"use client";

import { useState } from "react";
import { Moon, MapPin, Clock, Bell, Plus, Search, X } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { HeadphoneCheckCard } from "@/src/components/HeadphoneCheckCard";
import { TimeWheelPicker } from "@/src/components/TimeWheelPicker";
import { LEAD_TIMES } from "@/src/lib/data";
import type { AlarmInput, Station } from "@/src/lib/types";
import type { StationRow } from "@/src/lib/stations";
import { calculateAlarmTime, formatTime, isFuture } from "@/src/lib/time";

interface SetupScreenProps {
  input: AlarmInput;
  onInputChange: (patch: Partial<AlarmInput>) => void;
  earphoneChecked: boolean;
  earphoneConnected: boolean;
  routeName: string;
  stations: StationRow[];
  onSetAlarm: () => void;
  onHeadphoneCheckStart?: () => void;
  onHeadphoneCheckEnd: (connected: boolean, name: string, error: string | null) => void;
  onSelectStation: (s: Station) => void;
  onAddStation: (name: string) => Promise<void>;
}

export function SetupScreen({
  input,
  onInputChange,
  earphoneChecked,
  earphoneConnected,
  routeName,
  stations,
  onSetAlarm,
  onHeadphoneCheckStart,
  onHeadphoneCheckEnd,
  onSelectStation,
  onAddStation,
}: SetupScreenProps) {
  const [adding, setAdding] = useState(false);
  const [stationName, setStationName] = useState("");
  const leadTime =
    LEAD_TIMES.find((l) => l.id === input.leadTimeId) ?? LEAD_TIMES[1];
  const alarmTime = calculateAlarmTime(input.arrivalTime, leadTime);
  const ready =
    input.station !== null &&
    earphoneChecked &&
    earphoneConnected &&
    isFuture(alarmTime);

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

      {/* 1. 目的地 */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-moon text-[13px] font-extrabold text-night-deep">
            1
          </div>
          <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
            <MapPin size={16} />
            目的地を選ぶ
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-full bg-moon/15 px-3.5 py-2 text-[13px] font-extrabold text-moon transition-all hover:bg-moon/25 active:scale-95"
        >
          <Plus size={15} strokeWidth={3} />
          駅を追加
        </button>
      </div>
      <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
        {stations.map((s) => {
          const selected = input.station?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectStation(s)}
              className={`shrink-0 rounded-2xl border px-5 py-3.5 text-[15px] font-bold transition-all active:scale-95 ${
                selected
                  ? "border-moon bg-moon text-night-deep"
                  : "border-border bg-card text-foreground hover:bg-night-surface"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* 駅追加モーダル */}
      {adding && (
        <StationAddModal
          value={stationName}
          onChange={setStationName}
          onClose={() => {
            setAdding(false);
            setStationName("");
          }}
          onAdd={async () => {
            if (!stationName.trim()) return;
            await onAddStation(stationName);
            setAdding(false);
            setStationName("");
          }}
        />
      )}

      {/* 2. 到着予定時刻 */}
      <SectionLabel num="2" text="到着予定時刻" icon={<Clock size={16} />} />
      <TimeWheelPicker
        hour={input.arrivalTime.getHours()}
        minute={input.arrivalTime.getMinutes()}
        onComplete={(h, m) => {
          const newDate = new Date(input.arrivalTime);
          newDate.setHours(h, m, 0, 0);
          onInputChange({ arrivalTime: newDate });
        }}
      />

      {/* 3. 起こすタイミング */}
      <SectionLabel num="3" text="起こすタイミング" icon={<Bell size={16} />} />
      <div className="flex gap-2.5">
        {LEAD_TIMES.map((l) => {
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

      {/* 4. イヤホン接続状態 */}
      <SectionLabel num="4" text="イヤホン接続確認" icon={<Bell size={16} />} />
      <HeadphoneCheckCard
        checked={earphoneChecked}
        connected={earphoneConnected}
        routeName={routeName}
        onCheckStart={onHeadphoneCheckStart}
        onCheckEnd={onHeadphoneCheckEnd}
      />

      {/* 5. 計算された起床時刻（概要） */}
      <SectionLabel num="5" text="起床時刻" />
      <Card className="bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">起床時刻</span>
          <span className="text-2xl font-extrabold tabular-nums text-moon">
            {formatTime(alarmTime)}
          </span>
        </div>
        <div className="my-3.5 h-px bg-border" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">目的地</span>
          <span className="font-bold text-foreground">
            {input.station?.name ?? "未選択"}
          </span>
        </div>
      </Card>

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
          {!input.station
            ? "目的地を選んでください"
            : !earphoneChecked
              ? "イヤホン接続を確認してください"
              : !earphoneConnected
                ? "イヤホンを接続してください"
                : "到着時刻が過去です。時刻を変更してください"}
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

function StationAddModal({
  value,
  onChange,
  onClose,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night-deep/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-moon/30 bg-night-card p-6 pb-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-foreground">駅を追加</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            autoFocus
            value={value}
            placeholder="駅名・目的地を入力"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
            className="w-full rounded-2xl border border-border bg-night-deep/60 py-4 pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-moon"
          />
        </div>

        <button
          onClick={onAdd}
          disabled={!value.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-moon py-3.5 text-base font-extrabold text-night-deep transition-all active:scale-[0.98] disabled:opacity-40"
        >
          <Plus size={20} strokeWidth={3} />
          追加する
        </button>
      </div>
    </div>
  );
}
