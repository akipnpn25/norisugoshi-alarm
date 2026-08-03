"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";

import { Card } from "@/src/components/ui/card";
import { loadAdaptiveAlarmSettings } from "@/src/lib/adaptive-alarm-settings";
import { ensureAnonymousSession } from "@/src/lib/auth";
import {
  buildWeeklySummary,
  formatWeekRange,
  getCurrentWeekRange,
  type WeeklySummary,
} from "@/src/lib/recommendation";
import { supabase } from "@/src/lib/supabase";
import type { AlarmHistoryRow } from "@/src/lib/types";

export function WeeklyReportCard() {
  const [summary, setSummary] =
    useState<WeeklySummary | null>(null);
  const [error, setError] = useState(false);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(
    () => loadAdaptiveAlarmSettings().enabled
  );

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setError(false);
    setAdaptiveEnabled(loadAdaptiveAlarmSettings().enabled);

    try {
      await ensureAnonymousSession();
    } catch (authError) {
      console.warn(
        "週次振り返りの利用者準備に失敗:",
        authError
      );
      setError(true);
      return;
    }

    const range = getCurrentWeekRange();
    const { data, error: loadError } =
      await supabase
        .from("alarm_history")
        .select("*")
        .gte(
          "first_interaction_at",
          range.start.toISOString()
        )
        .lt(
          "first_interaction_at",
          range.end.toISOString()
        )
        .order("first_interaction_at", {
          ascending: false,
        });

    if (loadError) {
      console.warn(
        "週次振り返りの読み込みに失敗:",
        loadError
      );
      setError(true);
      return;
    }

    setSummary(
      buildWeeklySummary(
        (data ?? []) as AlarmHistoryRow[]
      )
    );
  };

  if (error) {
    return null;
  }

  return (
    <Card className="mt-4 border-moon/25 bg-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
          <CalendarDays size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-base font-extrabold text-foreground">
              今週の振り返り
            </p>
            {summary && (
              <p className="text-[11px] font-bold text-muted-foreground">
                {formatWeekRange(summary.range)}
              </p>
            )}
          </div>

          {!summary ? (
            <p className="mt-3 text-sm text-muted-foreground">
              読み込み中...
            </p>
          ) : summary.total === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              今週はまだ、時間内の反応を
              確認できる記録がありません。
            </p>
          ) : (
            <>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-extrabold tabular-nums text-moon">
                  {summary.onTime}
                </span>
                <span className="pb-1 text-sm font-bold text-muted-foreground">
                  / {summary.total}回
                </span>
              </div>

              <p className="mt-1 text-sm font-bold text-foreground">
                時間内に反応できました
              </p>

              {!adaptiveEnabled ? (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
                  <Info
                    size={17}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    スマート調整はOFFです。
                    学習によるおすすめは表示されません。
                  </p>
                </div>
              ) : summary.late === 0 ? (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-success/10 px-3 py-2.5">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-success"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    今週はすべて時間内でした。
                    今の起こし方が合っていそうです。
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-moon/10 px-3 py-2.5">
                  <TriangleAlert
                    size={17}
                    className="mt-0.5 shrink-0 text-moon"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    今週は{summary.late}回遅れがありました。
                    次回は少し強い起こし方がおすすめです。
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
