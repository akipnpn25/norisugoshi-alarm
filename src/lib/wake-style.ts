import type { AlarmMode, WakeStyleId } from "./types";
import { DEFAULT_WAKE_STYLE_ID, WAKE_STYLES } from "./data";

const STORAGE_KEY = "oyasumi_assist_wake_styles";

type StoredWakeStyles = Partial<Record<AlarmMode, WakeStyleId>>;

function isWakeStyleId(value: unknown): value is WakeStyleId {
  return WAKE_STYLES.some((style) => style.id === value);
}

export function getStoredWakeStyle(mode: AlarmMode): WakeStyleId {
  if (typeof window === "undefined") return DEFAULT_WAKE_STYLE_ID;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WAKE_STYLE_ID;

    const stored = JSON.parse(raw) as StoredWakeStyles;
    return isWakeStyleId(stored[mode])
      ? stored[mode]
      : DEFAULT_WAKE_STYLE_ID;
  } catch (error) {
    console.warn("起こし方の読み込みに失敗:", error);
    return DEFAULT_WAKE_STYLE_ID;
  }
}

export function storeWakeStyle(
  mode: AlarmMode,
  wakeStyleId: WakeStyleId
): void {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored: StoredWakeStyles = raw ? JSON.parse(raw) : {};

    stored[mode] = wakeStyleId;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn("起こし方の保存に失敗:", error);
  }
}
