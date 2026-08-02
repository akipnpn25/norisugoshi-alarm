"use client";

export interface AdaptiveAlarmSettings {
  enabled: boolean;
  /** この時刻より前の履歴は、スマート調整の計算に使わない。 */
  historySince: string | null;
}

const STORAGE_KEY = "oyasumi_assist_adaptive_alarm_settings";

export const DEFAULT_ADAPTIVE_ALARM_SETTINGS: AdaptiveAlarmSettings = {
  enabled: true,
  historySince: null,
};

function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

export function loadAdaptiveAlarmSettings(): AdaptiveAlarmSettings {
  if (typeof window === "undefined") {
    return DEFAULT_ADAPTIVE_ALARM_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ADAPTIVE_ALARM_SETTINGS;
    }

    const parsed = JSON.parse(raw) as {
      enabled?: unknown;
      historySince?: unknown;
    };

    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_ADAPTIVE_ALARM_SETTINGS.enabled,
      historySince: isValidIsoDate(parsed.historySince)
        ? parsed.historySince
        : null,
    };
  } catch (error) {
    console.warn("スマート調整設定の読み込みに失敗:", error);
    return DEFAULT_ADAPTIVE_ALARM_SETTINGS;
  }
}

export function saveAdaptiveAlarmSettings(
  settings: AdaptiveAlarmSettings
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.warn("スマート調整設定の保存に失敗:", error);
  }
}

export function createResetAdaptiveAlarmSettings(
  current: AdaptiveAlarmSettings,
  now: Date = new Date()
): AdaptiveAlarmSettings {
  return {
    ...current,
    historySince: now.toISOString(),
  };
}
