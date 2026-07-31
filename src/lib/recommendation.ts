"use client";

import type {
  AlarmHistoryRow,
  AlarmMode,
  WakeStyleId,
} from "./types";

export type RecommendationMode = Extract<
  AlarmMode,
  "transit" | "break"
>;

export interface ImmediateRecommendation {
  mode: RecommendationMode;
  currentWakeStyleId: WakeStyleId;
  recommendedWakeStyleId: WakeStyleId | null;
  consecutiveLateCount: number;
}

export type ResponseOutcome =
  | "on-time"
  | "late"
  | "unmeasured";

interface RecommendationStorage {
  lateStreaks: Partial<
    Record<RecommendationMode, number>
  >;
  pendingWakeStyles: Partial<
    Record<RecommendationMode, WakeStyleId>
  >;
}

export interface WeekRange {
  start: Date;
  end: Date;
}

export interface WeeklySummary {
  range: WeekRange;
  total: number;
  onTime: number;
  late: number;
}

const STORAGE_KEY =
  "oyasumi_assist_recommendation_state";

const WAKE_STYLE_ORDER: WakeStyleId[] = [
  "gentle",
  "standard",
  "strong",
];

function emptyStorage(): RecommendationStorage {
  return {
    lateStreaks: {},
    pendingWakeStyles: {},
  };
}

function isRecommendationMode(
  value: unknown
): value is RecommendationMode {
  return value === "transit" || value === "break";
}

function isWakeStyleId(
  value: unknown
): value is WakeStyleId {
  return (
    value === "gentle" ||
    value === "standard" ||
    value === "strong"
  );
}

function loadStorage(): RecommendationStorage {
  if (typeof window === "undefined") {
    return emptyStorage();
  }

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return emptyStorage();

    const parsed = JSON.parse(raw) as {
      lateStreaks?: Record<string, unknown>;
      pendingWakeStyles?: Record<string, unknown>;
    };
    const result = emptyStorage();

    for (const mode of ["transit", "break"] as const) {
      const streak = parsed.lateStreaks?.[mode];

      if (
        typeof streak === "number" &&
        Number.isInteger(streak) &&
        streak >= 0
      ) {
        result.lateStreaks[mode] = streak;
      }

      const wakeStyle =
        parsed.pendingWakeStyles?.[mode];

      if (isWakeStyleId(wakeStyle)) {
        result.pendingWakeStyles[mode] =
          wakeStyle;
      }
    }

    return result;
  } catch (error) {
    console.warn(
      "おすすめ設定の読み込みに失敗:",
      error
    );
    return emptyStorage();
  }
}

function saveStorage(
  storage: RecommendationStorage
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(storage)
    );
  } catch (error) {
    console.warn(
      "おすすめ設定の保存に失敗:",
      error
    );
  }
}

export function getStrongerWakeStyle(
  current: WakeStyleId
): WakeStyleId | null {
  const index = WAKE_STYLE_ORDER.indexOf(current);

  if (
    index < 0 ||
    index >= WAKE_STYLE_ORDER.length - 1
  ) {
    return null;
  }

  return WAKE_STYLE_ORDER[index + 1];
}

export function recordTimedResponse(
  mode: RecommendationMode,
  respondedOnTime: boolean
): number {
  const storage = loadStorage();
  const nextStreak = respondedOnTime
    ? 0
    : (storage.lateStreaks[mode] ?? 0) + 1;

  storage.lateStreaks[mode] = nextStreak;
  saveStorage(storage);

  return nextStreak;
}

export function getPendingWakeStyles(): Partial<
  Record<RecommendationMode, WakeStyleId>
> {
  return {
    ...loadStorage().pendingWakeStyles,
  };
}

export function setPendingWakeStyle(
  mode: RecommendationMode,
  wakeStyleId: WakeStyleId
): void {
  const storage = loadStorage();
  storage.pendingWakeStyles[mode] = wakeStyleId;
  saveStorage(storage);
}

export function clearPendingWakeStyle(
  mode: RecommendationMode
): void {
  const storage = loadStorage();
  delete storage.pendingWakeStyles[mode];
  saveStorage(storage);
}

export function getCurrentWeekRange(
  now: Date = new Date()
): WeekRange {
  const start = new Date(now);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function validDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export function getResponseOutcome(
  row: AlarmHistoryRow
): ResponseOutcome {
  if (
    row.status !== "fired" ||
    row.demo_mode !== "normal" ||
    !isRecommendationMode(row.mode)
  ) {
    return "unmeasured";
  }

  const firstInteraction = validDate(
    row.first_interaction_at
  );

  if (!firstInteraction) {
    return "unmeasured";
  }

  const baseDeadline =
    row.mode === "transit"
      ? validDate(row.arrival_time)
      : validDate(row.alarm_time);

  if (!baseDeadline) {
    return "unmeasured";
  }

  const deadline =
    row.mode === "break"
      ? new Date(
          baseDeadline.getTime() + 60 * 1000
        )
      : baseDeadline;

  return firstInteraction.getTime() <=
    deadline.getTime()
    ? "on-time"
    : "late";
}

export function buildWeeklySummary(
  rows: AlarmHistoryRow[],
  now: Date = new Date()
): WeeklySummary {
  const range = getCurrentWeekRange(now);
  let onTime = 0;
  let late = 0;

  for (const row of rows) {
    const responseAt = validDate(
      row.first_interaction_at
    );

    if (
      !responseAt ||
      responseAt.getTime() < range.start.getTime() ||
      responseAt.getTime() >= range.end.getTime()
    ) {
      continue;
    }

    const outcome = getResponseOutcome(row);

    if (outcome === "on-time") {
      onTime += 1;
    } else if (outcome === "late") {
      late += 1;
    }
  }

  return {
    range,
    total: onTime + late,
    onTime,
    late,
  };
}

export function formatWeekRange(
  range: WeekRange
): string {
  const lastDay = new Date(
    range.end.getTime() - 1
  );

  return `${range.start.getMonth() + 1}月${range.start.getDate()}日〜${
    lastDay.getMonth() + 1
  }月${lastDay.getDate()}日`;
}
