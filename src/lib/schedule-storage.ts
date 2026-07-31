import { LEAD_TIMES, WAKE_STYLES } from "./data";
import type {
  LeadTimeId,
  RecurringSchedule,
  RecurringScheduleOccurrence,
  RepeatPattern,
  TransitRecurringSchedule,
  WakeStyleId,
  Weekday,
} from "./types";

const STORAGE_KEY = "oyasumi_assist_recurring_schedules";
const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const BUSINESS_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const MAX_LOOKAHEAD_DAYS = 14;

function isWeekday(value: unknown): value is Weekday {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 0 &&
    value <= 6
  );
}

function isRepeatPattern(value: unknown): value is RepeatPattern {
  return (
    value === "daily" ||
    value === "weekdays" ||
    value === "custom"
  );
}

function isWakeStyleId(value: unknown): value is WakeStyleId {
  return WAKE_STYLES.some((style) => style.id === value);
}

function isLeadTimeId(value: unknown): value is LeadTimeId {
  return LEAD_TIMES.some((leadTime) => leadTime.id === value);
}

function isValidHour(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 0 &&
    value <= 23
  );
}

function isValidMinute(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 0 &&
    value <= 59
  );
}

function normalizeWeekdays(
  repeatPattern: RepeatPattern,
  weekdays: unknown
): Weekday[] {
  if (repeatPattern === "daily") {
    return [...ALL_WEEKDAYS];
  }

  if (repeatPattern === "weekdays") {
    return [...BUSINESS_WEEKDAYS];
  }

  if (!Array.isArray(weekdays)) {
    return [...BUSINESS_WEEKDAYS];
  }

  const normalized = Array.from(
    new Set(weekdays.filter(isWeekday))
  ).sort((a, b) => a - b);

  return normalized;
}

function normalizeSkippedDates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(item)
      )
    )
  );
}

function normalizeSchedule(
  value: unknown
): RecurringSchedule | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const repeatPattern = isRepeatPattern(raw.repeatPattern)
    ? raw.repeatPattern
    : "weekdays";
  const base = {
    id:
      typeof raw.id === "string" && raw.id
        ? raw.id
        : crypto.randomUUID(),
    enabled: raw.enabled !== false,
    repeatPattern,
    weekdays: normalizeWeekdays(
      repeatPattern,
      raw.weekdays
    ),
    skippedDates: normalizeSkippedDates(
      raw.skippedDates
    ),
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString(),
  };

  if (raw.mode === "transit") {
    const station = raw.station;

    if (
      !station ||
      typeof station !== "object" ||
      typeof (station as Record<string, unknown>).id !==
        "string" ||
      typeof (station as Record<string, unknown>).name !==
        "string"
    ) {
      return null;
    }

    if (
      !isValidHour(raw.arrivalHour) ||
      !isValidMinute(raw.arrivalMinute) ||
      !isLeadTimeId(raw.leadTimeId) ||
      !isWakeStyleId(raw.wakeStyleId)
    ) {
      return null;
    }

    return {
      ...base,
      mode: "transit",
      station:
        station as TransitRecurringSchedule["station"],
      arrivalHour: raw.arrivalHour,
      arrivalMinute: raw.arrivalMinute,
      leadTimeId: raw.leadTimeId,
      wakeStyleId: raw.wakeStyleId,
    };
  }

  if (raw.mode === "break") {
    if (
      !isValidHour(raw.startHour) ||
      !isValidMinute(raw.startMinute) ||
      !Number.isInteger(raw.durationMinutes) ||
      typeof raw.durationMinutes !== "number" ||
      raw.durationMinutes < 1 ||
      raw.durationMinutes > 240 ||
      !isWakeStyleId(raw.wakeStyleId)
    ) {
      return null;
    }

    return {
      ...base,
      mode: "break",
      startHour: raw.startHour,
      startMinute: raw.startMinute,
      durationMinutes: raw.durationMinutes,
      warningEnabled:
        raw.warningEnabled === true &&
        raw.durationMinutes > 5,
      wakeStyleId: raw.wakeStyleId,
    };
  }

  return null;
}

export function loadRecurringSchedules(): RecurringSchedule[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeSchedule)
      .filter(
        (schedule): schedule is RecurringSchedule =>
          schedule !== null
      );
  } catch (error) {
    console.warn("繰り返し予定の読み込みに失敗:", error);
    return [];
  }
}

export function saveRecurringSchedules(
  schedules: RecurringSchedule[]
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(schedules)
    );
  } catch (error) {
    console.warn("繰り返し予定の保存に失敗:", error);
  }
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getScheduleWeekdays(
  schedule: RecurringSchedule
): Weekday[] {
  return normalizeWeekdays(
    schedule.repeatPattern,
    schedule.weekdays
  );
}

export function isScheduleForDate(
  schedule: RecurringSchedule,
  date: Date
): boolean {
  return (
    getScheduleWeekdays(schedule).includes(
      date.getDay() as Weekday
    ) &&
    !schedule.skippedDates.includes(toLocalDateKey(date))
  );
}

export function isScheduleNormallyForDate(
  schedule: RecurringSchedule,
  date: Date
): boolean {
  return getScheduleWeekdays(schedule).includes(
    date.getDay() as Weekday
  );
}

export function getNextOccurrenceForSchedule(
  schedule: RecurringSchedule,
  now: Date = new Date()
): RecurringScheduleOccurrence | null {
  if (!schedule.enabled) return null;

  for (
    let offset = 0;
    offset <= MAX_LOOKAHEAD_DAYS;
    offset += 1
  ) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);

    if (!isScheduleForDate(schedule, day)) {
      continue;
    }

    if (schedule.mode === "transit") {
      const arrivalTime = new Date(day);
      arrivalTime.setHours(
        schedule.arrivalHour,
        schedule.arrivalMinute,
        0,
        0
      );

      const leadTime =
        LEAD_TIMES.find(
          (item) => item.id === schedule.leadTimeId
        ) ?? LEAD_TIMES[1];
      const triggerAt = new Date(
        arrivalTime.getTime() -
          leadTime.minutesBefore * 60 * 1000
      );

      if (triggerAt.getTime() > now.getTime()) {
        return {
          schedule,
          triggerAt,
          targetAt: arrivalTime,
        };
      }

      continue;
    }

    const triggerAt = new Date(day);
    triggerAt.setHours(
      schedule.startHour,
      schedule.startMinute,
      0,
      0
    );
    const targetAt = new Date(
      triggerAt.getTime() +
        schedule.durationMinutes * 60 * 1000
    );

    if (triggerAt.getTime() > now.getTime()) {
      return {
        schedule,
        triggerAt,
        targetAt,
      };
    }
  }

  return null;
}

export function getNextRecurringOccurrence(
  schedules: RecurringSchedule[],
  now: Date = new Date()
): RecurringScheduleOccurrence | null {
  const occurrences = schedules
    .map((schedule) =>
      getNextOccurrenceForSchedule(schedule, now)
    )
    .filter(
      (
        occurrence
      ): occurrence is RecurringScheduleOccurrence =>
        occurrence !== null
    )
    .sort(
      (a, b) =>
        a.triggerAt.getTime() - b.triggerAt.getTime()
    );

  return occurrences[0] ?? null;
}

export function getRepeatLabel(
  schedule: RecurringSchedule
): string {
  if (schedule.repeatPattern === "daily") {
    return "毎日";
  }

  if (schedule.repeatPattern === "weekdays") {
    return "平日";
  }

  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  return getScheduleWeekdays(schedule)
    .map((day) => labels[day])
    .join("・");
}
