import { LEAD_TIMES, WAKE_STYLES } from "./data";
import { ALARM_SOUNDS } from "./sound";
import type {
  AlarmSoundId,
  BreakQuickSetting,
  LeadTimeId,
  QuickSetting,
  Station,
  TransitQuickSetting,
  WakeStyleId,
} from "./types";

const STORAGE_KEY = "oyasumi_assist_quick_settings";

function isWakeStyleId(value: unknown): value is WakeStyleId {
  return WAKE_STYLES.some((style) => style.id === value);
}


function isAlarmSoundId(value: unknown): value is AlarmSoundId {
  return ALARM_SOUNDS.some((sound) => sound.id === value);
}

function isLeadTimeId(value: unknown): value is LeadTimeId {
  return LEAD_TIMES.some((leadTime) => leadTime.id === value);
}

function isDurationMinutes(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 1 &&
    value <= 240
  );
}

function normalizeStation(value: unknown): Station | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name,
    kana: typeof raw.kana === "string" ? raw.kana : "",
  };
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

function getLegacyArrivalTime(
  durationMinutes: unknown
): { hour: number; minute: number } | null {
  if (!isDurationMinutes(durationMinutes)) return null;

  const arrival = new Date(
    Date.now() + durationMinutes * 60 * 1000
  );
  arrival.setSeconds(0, 0);

  return {
    hour: arrival.getHours(),
    minute: arrival.getMinutes(),
  };
}

function normalizeQuickSetting(value: unknown): QuickSetting | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";

  if (!name || !isWakeStyleId(raw.wakeStyleId)) {
    return null;
  }

  const now = new Date().toISOString();
  const base = {
    id:
      typeof raw.id === "string" && raw.id
        ? raw.id
        : crypto.randomUUID(),
    name,
    wakeStyleId: raw.wakeStyleId,
    alarmSoundId: isAlarmSoundId(raw.alarmSoundId)
      ? raw.alarmSoundId
      : "radial",
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };

  if (raw.mode === "transit") {
    const station = normalizeStation(raw.station);
    if (!station || !isLeadTimeId(raw.leadTimeId)) return null;

    const legacyArrival = getLegacyArrivalTime(
      raw.durationMinutes
    );
    const arrivalHour = isValidHour(raw.arrivalHour)
      ? raw.arrivalHour
      : legacyArrival?.hour;
    const arrivalMinute = isValidMinute(raw.arrivalMinute)
      ? raw.arrivalMinute
      : legacyArrival?.minute;

    if (
      arrivalHour === undefined ||
      arrivalMinute === undefined
    ) {
      return null;
    }

    const setting: TransitQuickSetting = {
      ...base,
      mode: "transit",
      station,
      arrivalHour,
      arrivalMinute,
      leadTimeId: raw.leadTimeId,
    };

    return setting;
  }

  if (raw.mode === "break") {
    if (!isDurationMinutes(raw.durationMinutes)) return null;

    const setting: BreakQuickSetting = {
      ...base,
      mode: "break",
      durationMinutes: raw.durationMinutes,
      warningEnabled:
        raw.warningEnabled === true && raw.durationMinutes > 5,
    };

    return setting;
  }

  return null;
}

export function loadQuickSettings(): QuickSetting[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeQuickSetting)
      .filter(
        (setting): setting is QuickSetting => setting !== null
      );
  } catch (error) {
    console.warn("ワンタップ設定の読み込みに失敗:", error);
    return [];
  }
}

export function saveQuickSettings(settings: QuickSetting[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.warn("ワンタップ設定の保存に失敗:", error);
  }
}
