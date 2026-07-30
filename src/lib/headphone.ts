import type { AudioRoute } from "./types";

const HEADPHONE_KEYWORDS = [
  "headphone",
  "headphones",
  "headset",
  "earphone",
  "earphones",
  "earbuds",
  "buds",
  "airpods",
  "bluetooth",
  "bt",
  "usb",
  "hdmi",
  "ヘッドホン",
  "イヤホン",
  "蓝牙",
  "无線",
  "ワイヤレス",
];

const SPEAKER_KEYWORDS = ["speaker", "スピーカー", "内蔵", "builtin", "built-in", "internal", "receiver"];

function classifyLabel(label: string): { type: AudioRoute["type"]; connected: boolean } | null {
  const lower = label.toLowerCase();
  const isHeadphone = HEADPHONE_KEYWORDS.some((k) => lower.includes(k));
  if (isHeadphone) {
    const isBluetooth =
      lower.includes("bluetooth") ||
      lower.includes("airpods") ||
      lower.includes("buds") ||
      lower.includes("bt") ||
      lower.includes("ワイヤレス") ||
      lower.includes("無線");
    return { type: isBluetooth ? "bluetooth" : "headphones", connected: true };
  }
  const isSpeaker = SPEAKER_KEYWORDS.some((k) => lower.includes(k));
  if (isSpeaker) {
    return { type: "speaker", connected: false };
  }
  return null;
}

async function requestAudioPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * イヤホン接続を確実に判定する。
 * 1) getUserMedia でマイク許可を取得 → デバイスラベルが読めるようになる
 * 2) audiooutput デバイスを列挙し、ラベルからヘッドホン/Bluetoothを判定
 * 3) ラベル不明時はデバイス数の増減で推測
 */
export async function getAudioRoute(): Promise<AudioRoute> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { type: "unknown", name: "対応していない環境です", connected: false };
  }

  // 権限を取得してラベルを表示可能にする
  await requestAudioPermission();

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

    if (audioOutputs.length === 0) {
      return { type: "unknown", name: "取得できませんでした", connected: false };
    }

    // ラベルが取れたデバイスを優先的に分類
    for (const d of audioOutputs) {
      if (d.label) {
        const result = classifyLabel(d.label);
        if (result) {
          return { ...result, name: d.label };
        }
      }
    }

    // ラベルから判定できなかった場合: デバイス数で推測
    // default と communications は通常スピーカー扱い。それ以外の出力デバイスがあれば接続とみなす
    const nonSystemOutputs = audioOutputs.filter(
      (d) => d.deviceId !== "default" && d.deviceId !== "communications"
    );
    const hasExtraOutput = nonSystemOutputs.length > 0;
    const defaultDevice =
      audioOutputs.find((d) => d.deviceId === "default") ?? audioOutputs[0];
    const label = defaultDevice.label || "オーディオデバイス";

    if (hasExtraOutput) {
      return { type: "headphones", name: label, connected: true };
    }

    return { type: "speaker", name: label || "スピーカー", connected: false };
  } catch {
    return { type: "unknown", name: "取得できませんでした", connected: false };
  }
}

/** 下位互換: 同じ関数を公開 */
export async function getAudioRouteWithPermission(): Promise<AudioRoute> {
  return getAudioRoute();
}

/**
 * デバイスの接続/切断をリアルタイムで監視する。
 * コールバックは devicechange 発生時に最新の判定結果で呼ばれる。
 * 返した関数でリスナーを解除できる。
 */
export function onAudioDeviceChange(callback: (route: AudioRoute) => void): () => void {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return () => {};
  }
  const handler = () => {
    getAudioRoute().then(callback);
  };
  navigator.mediaDevices.addEventListener("devicechange", handler);
  return () => {
    navigator.mediaDevices.removeEventListener("devicechange", handler);
  };
}
