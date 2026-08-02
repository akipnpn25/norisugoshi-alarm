"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
} from "lucide-react";

import {
  getNextRecurringOccurrence,
} from "@/src/lib/schedule-storage";
import { formatTimeWithDay } from "@/src/lib/time";
import type { RecurringSchedule } from "@/src/lib/types";

interface ScheduleShortcutProps {
  schedules: RecurringSchedule[];
  onOpen: () => void;
}

export function ScheduleShortcut({
  schedules,
  onOpen,
}: ScheduleShortcutProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const enabledCount = schedules.filter(
    (schedule) => schedule.enabled
  ).length;
  const nextOccurrence = useMemo(
    () => getNextRecurringOccurrence(schedules, now),
    [schedules, now]
  );

  return (
    <div className="mx-auto max-w-md px-5 pt-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:bg-night-surface active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
          <CalendarClock size={21} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-foreground">
            繰り返し設定
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {nextOccurrence
              ? `次回 ${formatTimeWithDay(
                  nextOccurrence.triggerAt,
                  now
                )}`
              : enabledCount > 0
                ? "今日の設定はありません"
                : "毎日・平日・曜日指定で登録"}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-moon">
          {enabledCount > 0
            ? `${enabledCount}件`
            : "設定"}
          <ChevronRight size={17} />
        </span>
      </button>
    </div>
  );
}
