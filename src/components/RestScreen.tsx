"use client";

import { useEffect, useState } from "react";
import { Headphones, Bell, Clock, Moon, X } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import type { AlarmConfig } from "@/src/lib/types";
import { formatRemaining, formatTimeWithDay, secondsUntil } from "@/src/lib/time";

interface RestScreenProps {
  config: AlarmConfig;
  onCancel: () => void;
}

export function RestScreen({ config, onCancel }: RestScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [startedAt] = useState(() => new Date());
  const isDemo = config.demoMode.offsetSeconds !== null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = secondsUntil(config.alarmTime, now);
  const arrived = secs <= 0;

  // 進捗バー: この画面を開いてから起床時刻までの経過割合
  const totalSecs = Math.max(
    1,
    secondsUntil(config.alarmTime, startedAt)
  );
  const progress = Math.max(
    0,
    Math.min(100, ((totalSecs - secs) / totalSecs) * 100)
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8 animate-fade-in">
      {/* ヘッダー */}
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-extrabold text-foreground flex items-center justify-center gap-2">
          <Moon className="text-moon" size={28} />
          おやすみ準備OK！
        </h2>
      </div>

      {/* ステータスカード */}
      <Card className="px-5 py-5">
        <StatusRow
          icon={<Headphones size={22} />}
          label="出力先"
          value={config.earphoneConnected ? "イヤホン" : "本体スピーカー"}
          ok={true}
        />
        <div className="my-2.5 h-px bg-border" />
        <StatusRow
          icon={<Bell size={22} />}
          label="起こし方"
          value={config.wakeStyle.label}
          ok
        />
        <div className="my-2.5 h-px bg-border" />
        <StatusRow
          icon={<Bell size={22} />}
          label="アラーム"
          value="✓ 設定済み"
          ok
        />
        <div className="my-2.5 h-px bg-border" />
        <StatusRow
          icon={<Clock size={22} />}
          label="起床予定"
          value={formatTimeWithDay(config.alarmTime, now)}
          ok
        />
      </Card>

      {/* 残り時間 */}
      <div className="my-8 flex flex-col items-center">
        <p className="mb-4 text-lg font-bold text-moon">
          {config.station.name}まで
        </p>
        <p className="text-[15px] text-muted-foreground">あと</p>
        <p className="my-1.5 text-6xl font-extrabold tabular-nums text-foreground">
          {formatRemaining(secs)}
        </p>
        <p className="text-[15px] text-muted-foreground">休めます</p>

        {/* 進捗バー */}
        <div className="mt-6 w-full">
          <Progress value={progress} />
        </div>
      </div>

      {/* 安心メッセージ */}
      <p className="mb-2 text-center text-base font-bold text-foreground">
        {arrived ? "まもなく起床時刻です" : "安心しておやすみください"}
      </p>
      <p className="mb-8 text-center text-[13px] text-muted-foreground">
        {formatTimeWithDay(config.arrivalTime, now)} 到着予定
        {isDemo ? " （デモモード実行中）" : ""}
      </p>

      {/* キャンセル */}
      <div className="mt-auto">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full"
        >
          <X size={18} className="mr-1.5" />
          アラームを取り消す
        </Button>
      </div>
    </div>
  );
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
      <span className="mr-3.5 text-foreground/80">{icon}</span>
      <span className="flex-1 text-[15px] text-muted-foreground">{label}</span>
      <span
        className={`text-[15px] font-bold ${
          ok ? "text-success" : "text-destructive"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
