"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  Coffee,
  Headphones,
  Moon,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import type { AlarmConfig } from "@/src/lib/types";
import {
  formatRemaining,
  formatTimeWithDay,
  secondsUntil,
} from "@/src/lib/time";

interface RestScreenProps {
  config: AlarmConfig;
  onCancel: () => void;
}

export function RestScreen({
  config,
  onCancel,
}: RestScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [startedAt] = useState(() =>
    config.mode === "break" && config.breakStartedAt
      ? config.breakStartedAt
      : new Date()
  );
  const isBreak = config.mode === "break";
  const destinationName = config.station.name.trim();
  const isDemo = config.demoMode.offsetSeconds !== null;

  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () => clearInterval(id);
  }, []);

  const secs = secondsUntil(config.alarmTime, now);
  const arrived = secs <= 0;
  const totalSecs = Math.max(
    1,
    isBreak && config.breakDurationMinutes
      ? config.breakDurationMinutes * 60
      : secondsUntil(config.alarmTime, startedAt)
  );
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((totalSecs - secs) / totalSecs) * 100
    )
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8 animate-fade-in">
      <div className="mb-7 text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-extrabold text-foreground">
          {isBreak ? (
            <Coffee className="text-moon" size={28} />
          ) : (
            <Moon className="text-moon" size={28} />
          )}
          {isBreak ? "休憩中" : "おやすみ準備OK！"}
        </h2>
      </div>

      <Card className="mb-5 border-destructive/40 bg-destructive/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <TriangleAlert
            size={24}
            className="mt-0.5 shrink-0 text-destructive"
          />
          <div>
            <p className="text-base font-extrabold text-foreground">
              この画面を開いたままにしてください
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              端末をロックしたり、別のアプリへ移動したりすると、
              Web版では予定時刻に鳴らない場合があります。
            </p>
          </div>
        </div>
      </Card>

      <Card className="px-5 py-5">
        <StatusRow
          icon={<Headphones size={22} />}
          label="出力先"
          value={
            config.earphoneConnected
              ? "イヤホン"
              : "本体スピーカー"
          }
          ok
        />
        <Divider />
        <StatusRow
          icon={<Bell size={22} />}
          label="起こし方"
          value={config.wakeStyle.label}
          ok
        />

        {isBreak && (
          <>
            <Divider />
            <StatusRow
              icon={<Bell size={22} />}
              label="5分前予告"
              value={
                config.breakWarningEnabled
                  ? "あり"
                  : "なし"
              }
              ok
            />
          </>
        )}

        <Divider />
        <StatusRow
          icon={<Clock size={22} />}
          label={isBreak ? "終了予定" : "起床予定"}
          value={formatTimeWithDay(
            config.alarmTime,
            now
          )}
          ok
        />
      </Card>

      <div className="my-8 flex flex-col items-center">
        <p className="mb-4 text-lg font-bold text-moon">
          {isBreak
            ? "休憩終了まで"
            : destinationName
              ? `${destinationName}まで`
              : "起床予定まで"}
        </p>
        <p className="text-[15px] text-muted-foreground">
          あと
        </p>
        <p className="my-1.5 text-6xl font-extrabold tabular-nums text-foreground">
          {formatRemaining(secs)}
        </p>
        <p className="text-[15px] text-muted-foreground">
          休めます
        </p>

        <div className="mt-6 w-full">
          <Progress value={progress} />
        </div>
      </div>

      <p className="mb-2 text-center text-base font-bold text-foreground">
        {arrived
          ? isBreak
            ? "まもなく休憩終了です"
            : "まもなく起床時刻です"
          : isBreak
            ? "ゆっくり休んでください"
            : "安心しておやすみください"}
      </p>
      <p className="mb-8 text-center text-[13px] text-muted-foreground">
        {formatTimeWithDay(
          isBreak
            ? config.alarmTime
            : config.arrivalTime,
          now
        )}
        {isBreak ? " 休憩終了予定" : " 到着予定"}
        {isDemo ? " （デモモード実行中）" : ""}
      </p>

      <div className="mt-auto">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full"
        >
          <X size={18} className="mr-1.5" />
          {isBreak
            ? "休憩を取り消す"
            : "アラームを取り消す"}
        </Button>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-2.5 h-px bg-border" />;
}

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center py-2.5">
      <span className="mr-3.5 text-foreground/80">
        {icon}
      </span>
      <span className="flex-1 text-[15px] text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-[15px] font-bold ${
          ok
            ? "text-success"
            : "text-destructive"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
