"use client";

import { useEffect, useState } from "react";
import { History, Trash2, Bell, Headphones, Clock, MapPin } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { supabase } from "@/src/lib/supabase";
import { ensureAnonymousSession } from "@/src/lib/auth";
import { WAKE_STYLES } from "@/src/lib/data";
import type { AlarmHistoryRow } from "@/src/lib/types";
import { formatDateTime, formatTime } from "@/src/lib/time";

const STATUS_LABEL: Record<string, string> = {
  set: "設定中",
  fired: "鳴動済み",
  cancelled: "取り消し",
};

function wakeStyleLabel(id: AlarmHistoryRow["wake_style"]): string {
  return (
    WAKE_STYLES.find((style) => style.id === id)?.label ??
    "しっかり"
  );
}

export function HistoryScreen() {
  const [rows, setRows] = useState<AlarmHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setError(null);

    try {
      await ensureAnonymousSession();
    } catch (authError) {
      console.warn("匿名利用者の準備に失敗:", authError);
      setError("利用者情報の初期化に失敗しました");
      return;
    }
    const { data, error } = await supabase
      .from("alarm_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setError("履歴の読み込みに失敗しました");
      return;
    }
    setRows(data as AlarmHistoryRow[] | null);
  };

  const handleClear = async () => {
    try {
      await ensureAnonymousSession();
    } catch (authError) {
      console.warn("匿名利用者の準備に失敗:", authError);
      setError("利用者情報の初期化に失敗しました");
      return;
    }

    const { error } = await supabase.from("alarm_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      setError("履歴の削除に失敗しました");
      return;
    }
    setRows([]);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-4 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <History className="text-moon" size={28} />
            履歴
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            アラームの利用履歴
          </p>
        </div>
        {rows && rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 size={14} className="mr-1.5" />
            全削除
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10 text-center text-sm text-destructive">
          {error}
        </Card>
      )}

      {rows === null && !error && (
        <p className="mt-10 text-center text-sm text-muted-foreground">読み込み中...</p>
      )}

      {rows !== null && rows.length === 0 && !error && (
        <div className="mt-16 flex flex-col items-center text-center">
          <Bell className="text-muted-foreground/40" size={48} />
          <p className="mt-4 text-sm text-muted-foreground">
            まだ履歴がありません
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            アラームをセットするとここに記録されます
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="bg-card">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-extrabold text-foreground">
                  <MapPin size={16} className="text-moon" />
                  {r.station_name}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <div className="my-3 h-px bg-border" />
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[13px]">
                <Meta
                  icon={<Clock size={14} />}
                  label="到着"
                  value={formatTime(new Date(r.arrival_time))}
                />
                <Meta
                  icon={<Bell size={14} />}
                  label="鳴動"
                  value={formatTime(new Date(r.alarm_time))}
                />
                <Meta
                  icon={<Clock size={14} />}
                  label="リード"
                  value={`${r.lead_time_minutes}分前`}
                />
                <Meta
                  icon={<Bell size={14} />}
                  label="起こし方"
                  value={wakeStyleLabel(r.wake_style)}
                />
                <Meta
                  icon={<Headphones size={14} />}
                  label="出力先"
                  value={r.earphone_connected ? "イヤホン" : "本体スピーカー"}
                />
              </div>
              <p className="mt-3 text-right text-[11px] text-muted-foreground">
                {formatDateTime(new Date(r.created_at))}
                {r.demo_mode !== "normal" ? " ・デモ" : ""}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const color =
    status === "fired"
      ? "bg-success/15 text-success"
      : status === "cancelled"
        ? "bg-destructive/12 text-destructive"
        : "bg-moon/15 text-moon";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${color}`}>
      {label}
    </span>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
