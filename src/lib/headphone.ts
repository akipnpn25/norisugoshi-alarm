import type { AudioRoute } from "./types";

const PREFERRED_AUDIO_OUTPUT_KEY =
  "oyasumi_assist_preferred_audio_output";

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
  "ヘッドホン",
  "イヤホン",
  "蓝牙",
  "無線",
  "ワイヤレス",
];

const SPEAKER_KEYWORDS = [
  "speaker",
  "スピーカー",
  "内蔵",
  "builtin",
  "built-in",
  "internal",
  "receiver",
];

type DetectedAudioRoute = AudioRoute & {
  deviceId?: string;
};

function classifyLabel(
  label: string
): {
  type: AudioRoute["type"];
  connected: boolean;
} | null {
  const lower = label.toLowerCase();
  const isHeadphone = HEADPHONE_KEYWORDS.some((keyword) =>
    lower.includes(keyword)
  );

  if (isHeadphone) {
    const isBluetooth =
      lower.includes("bluetooth") ||
      lower.includes("airpods") ||
      lower.includes("buds") ||
      lower.includes("bt") ||
      lower.includes("ワイヤレス") ||
      lower.includes("無線");

    return {
      type: isBluetooth ? "bluetooth" : "headphones",
      connected: true,
    };
  }

  const isSpeaker = SPEAKER_KEYWORDS.some((keyword) =>
    lower.includes(keyword)
  );

  if (isSpeaker) {
    return {
      type: "speaker",
      connected: false,
    };
  }

  return null;
}

function storePreferredAudioOutputDeviceId(
  deviceId: string
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PREFERRED_AUDIO_OUTPUT_KEY,
      deviceId
    );
  } catch {
    // 保存できない環境では、端末の既定出力に任せる
  }
}

function clearPreferredAudioOutputDeviceId(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      PREFERRED_AUDIO_OUTPUT_KEY
    );
  } catch {
    // ignore
  }
}

export function getStoredAudioOutputDeviceId():
  | string
  | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(
      PREFERRED_AUDIO_OUTPUT_KEY
    );
  } catch {
    return null;
  }
}

async function requestAudioPermission(): Promise<boolean> {
  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

function toDetectedRoute(
  device: MediaDeviceInfo,
  classification: NonNullable<
    ReturnType<typeof classifyLabel>
  >
): DetectedAudioRoute {
  return {
    ...classification,
    name:
      device.label ||
      (classification.connected
        ? "イヤホン"
        : "本体スピーカー"),
    deviceId: device.deviceId,
  };
}

/**
 * 音声出力を確認する。
 * スピーカーが先に列挙されても、接続中のイヤホンを優先する。
 * 確認できたイヤホンの deviceId は、Web Audio の出力固定に使う。
 */
export async function getAudioRoute():
  Promise<DetectedAudioRoute> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return {
      type: "unknown",
      name: "対応していない環境です",
      connected: false,
    };
  }

  await requestAudioPermission();

  try {
    const devices =
      await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(
      (device) => device.kind === "audiooutput"
    );

    if (audioOutputs.length === 0) {
      clearPreferredAudioOutputDeviceId();

      return {
        type: "unknown",
        name: "取得できませんでした",
        connected: false,
      };
    }

    const classifiedOutputs = audioOutputs
      .map((device) => {
        const classification = device.label
          ? classifyLabel(device.label)
          : null;

        return classification
          ? toDetectedRoute(device, classification)
          : null;
      })
      .filter(
        (route): route is DetectedAudioRoute =>
          route !== null
      );

    const storedDeviceId =
      getStoredAudioOutputDeviceId();
    const storedHeadphone = storedDeviceId
      ? classifiedOutputs.find(
          (route) =>
            route.connected &&
            route.deviceId === storedDeviceId
        )
      : null;

    const detectedHeadphone =
      storedHeadphone ??
      classifiedOutputs.find(
        (route) => route.connected
      );

    if (detectedHeadphone?.deviceId) {
      storePreferredAudioOutputDeviceId(
        detectedHeadphone.deviceId
      );

      return detectedHeadphone;
    }

    // 以前確認したイヤホンが、現在の出力一覧に残っている場合は
    // ラベルが取得できなくても同じ機器として扱う。
    const storedOutput = storedDeviceId
      ? audioOutputs.find(
          (device) =>
            device.deviceId === storedDeviceId
        )
      : null;

    if (storedOutput) {
      return {
        type: "headphones",
        name: storedOutput.label || "イヤホン",
        connected: true,
        deviceId: storedOutput.deviceId,
      };
    }

    clearPreferredAudioOutputDeviceId();

    const detectedSpeaker =
      classifiedOutputs.find(
        (route) => route.type === "speaker"
      );
    const defaultOutput =
      audioOutputs.find(
        (device) => device.deviceId === "default"
      ) ?? audioOutputs[0];

    if (detectedSpeaker) {
      return detectedSpeaker;
    }

    return {
      type: "unknown",
      name:
        defaultOutput.label ||
        "出力先を判定できませんでした",
      connected: false,
      deviceId: defaultOutput.deviceId,
    };
  } catch {
    clearPreferredAudioOutputDeviceId();

    return {
      type: "unknown",
      name: "取得できませんでした",
      connected: false,
    };
  }
}

/** 下位互換: 同じ関数を公開 */
export async function getAudioRouteWithPermission():
  Promise<DetectedAudioRoute> {
  return getAudioRoute();
}

/**
 * デバイスの接続・切断を監視する。
 */
export function onAudioDeviceChange(
  callback: (route: DetectedAudioRoute) => void
): () => void {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices
  ) {
    return () => {};
  }

  const handler = () => {
    void getAudioRoute().then(callback);
  };

  navigator.mediaDevices.addEventListener(
    "devicechange",
    handler
  );

  return () => {
    navigator.mediaDevices.removeEventListener(
      "devicechange",
      handler
    );
  };
}
