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

export type AdaptiveAlarmProfile =
  | "standard"
  | "quick"
  | "balanced"
  | "slow";

export interface AdaptiveAlarmPlan {
  personalized: boolean;
  sampleCount: number;
  medianReactionMs: number | null;
  recentLateCount: number;
  extraLeadMinutes: number;
  stageTwoDelayMs: number;
  stageThreeDelayMs: number;
  profile: AdaptiveAlarmProfile;
}

export interface AdaptiveAlarmTimeResult {
  alarmTime: Date;
  appliedExtraLeadMinutes: number;
}

export const DEFAULT_ADAPTIVE_ALARM_PLAN: AdaptiveAlarmPlan = {
  personalized: false,
  sampleCount: 0,
  medianReactionMs: null,
  recentLateCount: 0,
  extraLeadMinutes: 0,
  stageTwoDelayMs: 30 * 1000,
  stageThreeDelayMs: 90 * 1000,
  profile: "standard",
};

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


function clampNumber(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundToFiveSeconds(valueMs: number): number {
  return Math.round(valueMs / 5000) * 5000;
}

function getMedian(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return Math.round(
    (sorted[middle - 1] + sorted[middle]) / 2
  );
}

/**
 * 直近の実測反応から、電車モードの段階アラームを安全な範囲で調整する。
 * 記録が3回未満の場合は、従来の30秒・90秒ルールを維持する。
 */
export function buildAdaptiveAlarmPlan(
  rows: AlarmHistoryRow[]
): AdaptiveAlarmPlan {
  const recentRows = [...rows]
    .filter(
      (row) =>
        row.mode === "transit" &&
        row.demo_mode === "normal" &&
        row.status === "fired"
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 20);

  const measuredRows = recentRows
    .filter(
      (row) =>
        typeof row.reaction_ms === "number" &&
        Number.isFinite(row.reaction_ms) &&
        row.reaction_ms >= 0 &&
        row.reaction_ms <= 5 * 60 * 1000
    )
    .slice(0, 10);

  const sampleCount = measuredRows.length;

  if (sampleCount < 3) {
    return {
      ...DEFAULT_ADAPTIVE_ALARM_PLAN,
      sampleCount,
    };
  }

  const medianReactionMs =
    getMedian(
      measuredRows.map((row) => row.reaction_ms as number)
    ) ?? DEFAULT_ADAPTIVE_ALARM_PLAN.stageTwoDelayMs;
  const recentLateCount = recentRows
    .map(getResponseOutcome)
    .filter((outcome) => outcome !== "unmeasured")
    .slice(0, 3)
    .filter((outcome) => outcome === "late").length;

  let profile: AdaptiveAlarmProfile;
  let stageTwoDelayMs: number;
  let extraLeadMinutes = 0;

  if (medianReactionMs <= 15 * 1000) {
    profile = "quick";
    stageTwoDelayMs = 45 * 1000;
  } else if (medianReactionMs <= 35 * 1000) {
    profile = "balanced";
    stageTwoDelayMs = clampNumber(
      roundToFiveSeconds(medianReactionMs + 10 * 1000),
      35 * 1000,
      50 * 1000
    );
  } else {
    profile = "slow";
    stageTwoDelayMs = clampNumber(
      roundToFiveSeconds(medianReactionMs + 10 * 1000),
      45 * 1000,
      60 * 1000
    );
    extraLeadMinutes = clampNumber(
      Math.ceil(medianReactionMs / (60 * 1000)),
      1,
      3
    );
  }

  if (recentLateCount >= 1) {
    extraLeadMinutes = Math.max(extraLeadMinutes, 1);
  }

  if (recentLateCount >= 2) {
    extraLeadMinutes = Math.max(extraLeadMinutes, 2);
  }

  return {
    personalized: true,
    sampleCount,
    medianReactionMs,
    recentLateCount,
    extraLeadMinutes,
    stageTwoDelayMs,
    stageThreeDelayMs: stageTwoDelayMs + 60 * 1000,
    profile,
  };
}

/**
 * 選択した起床時刻から、学習結果による前倒しを反映した実時刻を返す。
 * 手動設定で前倒し時刻をすでに過ぎている場合は、突然鳴らさず元の時刻を使う。
 * 繰り返し設定のタイマーから呼ぶ場合だけ allowImmediate を true にし、遅延分は即時開始する。
 */
export function getAdaptiveAlarmTime(
  baseAlarmTime: Date,
  plan: AdaptiveAlarmPlan,
  now: Date = new Date(),
  allowImmediate = false
): AdaptiveAlarmTimeResult {
  if (!plan.personalized || plan.extraLeadMinutes <= 0) {
    return {
      alarmTime: new Date(baseAlarmTime),
      appliedExtraLeadMinutes: 0,
    };
  }

  const desiredTime = new Date(
    baseAlarmTime.getTime() -
      plan.extraLeadMinutes * 60 * 1000
  );

  if (desiredTime.getTime() > now.getTime()) {
    return {
      alarmTime: desiredTime,
      appliedExtraLeadMinutes: plan.extraLeadMinutes,
    };
  }

  if (allowImmediate && baseAlarmTime.getTime() > now.getTime()) {
    return {
      alarmTime: new Date(now),
      appliedExtraLeadMinutes: plan.extraLeadMinutes,
    };
  }

  return {
    alarmTime: new Date(baseAlarmTime),
    appliedExtraLeadMinutes: 0,
  };
}
