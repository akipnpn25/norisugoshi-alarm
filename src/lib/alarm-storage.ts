import type { AlarmConfig } from "./types";

export const ACTIVE_ALARM_STORAGE_KEY =
  "norisugoshi_active_alarm";

export interface StoredActiveAlarm {
  station: AlarmConfig["station"];
  arrivalTime: string;
  leadTime: AlarmConfig["leadTime"];
  alarmTime: string;
  demoMode: AlarmConfig["demoMode"];
  earphoneConnected: boolean;
  historyId: string;
}

export function saveActiveAlarm(
  config: AlarmConfig,
  historyId: string
): void {
  if (typeof window === "undefined") return;

  const stored: StoredActiveAlarm = {
    station: config.station,
    arrivalTime: config.arrivalTime.toISOString(),
    leadTime: config.leadTime,
    alarmTime: config.alarmTime.toISOString(),
    demoMode: config.demoMode,
    earphoneConnected: config.earphoneConnected,
    historyId,
  };

  try {
    window.localStorage.setItem(
      ACTIVE_ALARM_STORAGE_KEY,
      JSON.stringify(stored)
    );
  } catch (error) {
    console.warn("アラーム設定の端末保存に失敗:", error);
  }
}

export function clearActiveAlarm(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      ACTIVE_ALARM_STORAGE_KEY
    );
  } catch (error) {
    console.warn("保存したアラーム設定の削除に失敗:", error);
  }
}

export function loadActiveAlarm(): {
  config: AlarmConfig;
  historyId: string;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      ACTIVE_ALARM_STORAGE_KEY
    );

    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredActiveAlarm;
    const arrivalTime = new Date(stored.arrivalTime);
    const alarmTime = new Date(stored.alarmTime);

    const invalid =
      !stored.station ||
      !stored.leadTime ||
      !stored.demoMode ||
      !stored.historyId ||
      Number.isNaN(arrivalTime.getTime()) ||
      Number.isNaN(alarmTime.getTime());

    if (invalid) {
      clearActiveAlarm();
      return null;
    }

    return {
      config: {
        station: stored.station,
        arrivalTime,
        leadTime: stored.leadTime,
        alarmTime,
        demoMode: stored.demoMode,
        earphoneConnected: Boolean(
          stored.earphoneConnected
        ),
      },
      historyId: stored.historyId,
    };
  } catch (error) {
    console.warn(
      "保存したアラーム設定の読み込みに失敗:",
      error
    );
    clearActiveAlarm();
    return null;
  }
}

