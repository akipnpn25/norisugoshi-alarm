import type { WakeStyleId } from "./types";

export type AlarmSoundId =
  | "radial"
  | "arpeggio"
  | "twinkle"
  | "sunrise"
  | "crescent"
  | "aurora"
  | "horizon";

export interface AlarmSound {
  id: AlarmSoundId;
  label: string;
  description: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: "radial", label: "ラジアル", description: "放射状に広がる澄んだ音" },
  { id: "arpeggio", label: "アルペジオ", description: "流れるような琶音" },
  { id: "twinkle", label: "トゥインクル", description: "きらめく星のような音" },
  { id: "sunrise", label: "サンライズ", description: "夜明けを告げるメロディ" },
  { id: "crescent", label: "クレセント", description: "三日月のやさしい音色" },
  { id: "aurora", label: "オーロラ", description: "揺らぐ光のような音" },
  { id: "horizon", label: "ホライズン", description: "地平線へ広がる音" },
];

const STORAGE_KEY = "alarmSoundId";
const DEFAULT_SOUND: AlarmSoundId = "radial";

export function getStoredAlarmSound(): AlarmSoundId {
  if (typeof window === "undefined") return DEFAULT_SOUND;
  try {
    const v = localStorage.getItem(STORAGE_KEY) as AlarmSoundId | null;
    if (v && ALARM_SOUNDS.some((s) => s.id === v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_SOUND;
}

export function storeAlarmSound(id: AlarmSoundId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/* ===== Web Audio synthesis ===== */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

type Tone = {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  detune?: number;
};

function playTone(
  ctx: AudioContext,
  t: Tone,
  gainScale = 1
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const start = ctx.currentTime + t.start;
  const end = start + t.dur;
  osc.type = t.type ?? "sine";
  osc.frequency.value = t.freq;
  if (t.detune) osc.detune.value = t.detune;

  // 音割れを避けながら、起こし方に応じて全体の強さを変える
  const peak = Math.min(0.42, (t.gain ?? 0.22) * gainScale);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.05);
}

/* Helpers for building notes from scale degrees. */
const A4 = 440;
function n(semis: number): number {
  return A4 * Math.pow(2, semis / 12);
}

/* Each pattern returns tones covering one loop cycle (seconds). */
function buildPattern(id: AlarmSoundId): { tones: Tone[]; cycle: number } {
  switch (id) {
    case "radial": {
      // 放射状: central bell then expanding ripples of fifths/octaves
      const tones: Tone[] = [];
      const center = n(-2); // G4
      tones.push({ freq: center, start: 0, dur: 1.6, type: "sine", gain: 0.26 });
      const ring = [0, 7, 12, 19];
      ring.forEach((semi, i) => {
        tones.push({
          freq: center * Math.pow(2, semi / 12),
          start: 0.35 + i * 0.08,
          dur: 1.3,
          type: "sine",
          gain: 0.14,
        });
      });
      // second pulse
      tones.push({ freq: center * 2, start: 1.1, dur: 0.9, type: "sine", gain: 0.12 });
      return { tones, cycle: 2.4 };
    }
    case "arpeggio": {
      // 流れるアルペジオ: rising and falling major arpeggio
      const arp = [0, 4, 7, 12, 16, 12, 7, 4];
      const tones: Tone[] = arp.map((semi, i) => ({
        freq: n(-5 + semi),
        start: i * 0.16,
        dur: 0.45,
        type: "triangle",
        gain: 0.2,
      }));
      return { tones, cycle: arp.length * 0.16 + 0.3 };
    }
    case "twinkle": {
      // きらめき: two-note twinkles with shimmer
      const base = n(-4); // A4
      const seq = [0, 12, 7, 19, 4, 16, 0, 12];
      const tones: Tone[] = seq.map((semi, i) => ({
        freq: base * Math.pow(2, semi / 12),
        start: i * 0.22,
        dur: 0.5,
        type: "sine",
        gain: 0.18,
        detune: i % 2 === 0 ? 6 : -6,
      }));
      return { tones, cycle: seq.length * 0.22 };
    }
    case "sunrise": {
      // 夜明けメロディ: gentle ascending phrase with harmony
      const melody = [
        { s: 0, d: 0.4 },
        { s: 4, d: 0.4 },
        { s: 7, d: 0.4 },
        { s: 12, d: 0.6 },
        { s: 9, d: 0.4 },
        { s: 7, d: 0.4 },
        { s: 12, d: 0.8 },
      ];
      const tones: Tone[] = [];
      let t = 0;
      melody.forEach((m, i) => {
        tones.push({
          freq: n(-8 + m.s),
          start: t,
          dur: m.d,
          type: "sine",
          gain: 0.22,
        });
        // harmony a third below on long notes
        if (i === 3 || i === 6) {
          tones.push({
            freq: n(-8 + m.s - 3),
            start: t,
            dur: m.d,
            type: "sine",
            gain: 0.12,
          });
        }
        t += m.d;
      });
      return { tones, cycle: t + 0.4 };
    }
    case "crescent": {
      // 三日月: soft lullaby-like phrase in a minor tonality
      const melody = [
        { s: 0, d: 0.5 },
        { s: 3, d: 0.5 },
        { s: 7, d: 0.5 },
        { s: 10, d: 0.7 },
        { s: 7, d: 0.5 },
        { s: 3, d: 0.5 },
        { s: 0, d: 0.9 },
      ];
      const tones: Tone[] = [];
      let t = 0;
      melody.forEach((m) => {
        tones.push({
          freq: n(-6 + m.s),
          start: t,
          dur: m.d,
          type: "triangle",
          gain: 0.2,
        });
        t += m.d;
      });
      return { tones, cycle: t + 0.4 };
    }
    case "aurora": {
      // オーロラ: slow swells with detuned layers
      const swells = [0, 5, 7, 12];
      const tones: Tone[] = swells.map((semi, i) => ({
        freq: n(-3 + semi),
        start: i * 0.5,
        dur: 1.8,
        type: "sine",
        gain: 0.14,
        detune: i % 2 === 0 ? 10 : -10,
      }));
      // shimmer on top
      tones.push({ freq: n(17), start: 0.8, dur: 1.2, type: "sine", gain: 0.1, detune: 8 });
      return { tones, cycle: 3.2 };
    }
    case "horizon": {
      // 地平線: broad open-fifth pedal with melodic accents
      const tones: Tone[] = [
        { freq: n(-12), start: 0, dur: 2.4, type: "sine", gain: 0.16 },
        { freq: n(-5), start: 0, dur: 2.4, type: "sine", gain: 0.12 },
        { freq: n(2), start: 0.6, dur: 0.7, type: "triangle", gain: 0.16 },
        { freq: n(7), start: 1.2, dur: 0.7, type: "triangle", gain: 0.16 },
        { freq: n(12), start: 1.8, dur: 0.9, type: "triangle", gain: 0.18 },
      ];
      return { tones, cycle: 2.8 };
    }
  }
}

type WakeSoundProfile = {
  gainScale: number;
  cycleScale: number;
  vibration: number | number[] | null;
};

function getWakeSoundProfile(
  wakeStyleId: WakeStyleId,
  elapsedSeconds: number
): WakeSoundProfile {
  if (wakeStyleId === "gentle") {
    return {
      gainScale: 0.52,
      cycleScale: 1.2,
      vibration: null,
    };
  }

  if (wakeStyleId === "strong") {
    if (elapsedSeconds < 8) {
      return {
        gainScale: 0.95,
        cycleScale: 0.95,
        vibration: [180, 80, 180],
      };
    }
    if (elapsedSeconds < 16) {
      return {
        gainScale: 1.2,
        cycleScale: 0.82,
        vibration: [220, 70, 220],
      };
    }
    return {
      gainScale: 1.5,
      cycleScale: 0.68,
      vibration: [280, 60, 280, 60, 280],
    };
  }

  if (elapsedSeconds < 10) {
    return {
      gainScale: 0.72,
      cycleScale: 1.05,
      vibration: null,
    };
  }
  if (elapsedSeconds < 20) {
    return {
      gainScale: 0.92,
      cycleScale: 0.95,
      vibration: 180,
    };
  }
  return {
    gainScale: 1.15,
    cycleScale: 0.82,
    vibration: [220, 90, 220],
  };
}

let loopTimer: ReturnType<typeof setTimeout> | null = null;
let currentSoundId: AlarmSoundId | null = null;
let alarmRunId = 0;

export function playAlarm(
  soundId?: AlarmSoundId,
  wakeStyleId: WakeStyleId = "standard"
): void {
  if (typeof window === "undefined") return;

  const id = soundId ?? getStoredAlarmSound();
  stopAlarm();

  currentSoundId = id;
  const runId = ++alarmRunId;
  const startedAt = performance.now();
  const { tones, cycle } = buildPattern(id);
  const ctx = getCtx();

  const playOnce = () => {
    if (currentSoundId !== id || alarmRunId !== runId) return;

    const elapsedSeconds = (performance.now() - startedAt) / 1000;
    const profile = getWakeSoundProfile(wakeStyleId, elapsedSeconds);

    for (const tone of tones) {
      playTone(ctx, tone, profile.gainScale);
    }

    if (profile.vibration && "vibrate" in navigator) {
      navigator.vibrate(profile.vibration);
    }

    loopTimer = setTimeout(
      playOnce,
      Math.max(450, cycle * 1000 * profile.cycleScale)
    );
  };

  playOnce();
}

export function stopAlarm(): void {
  currentSoundId = null;
  alarmRunId += 1;

  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(0);
  }
}

export function playBreakWarning(): void {
  if (typeof window === "undefined") return;

  const ctx = getCtx();
  const warningTones: Tone[] = [
    {
      freq: n(0),
      start: 0,
      dur: 0.35,
      type: "sine",
      gain: 0.14,
    },
    {
      freq: n(5),
      start: 0.28,
      dur: 0.45,
      type: "sine",
      gain: 0.16,
    },
  ];

  for (const tone of warningTones) {
    playTone(ctx, tone, 0.7);
  }

  if ("vibrate" in navigator) {
    navigator.vibrate(120);
  }
}

/** Play a short preview of a sound (one loop). */
export function previewSound(id: AlarmSoundId): void {
  if (typeof window === "undefined") return;
  const { tones, cycle } = buildPattern(id);
  const ctx = getCtx();
  for (const t of tones) playTone(ctx, t);
}

/* Legacy file-based API kept for compatibility but unused. */
let audio: HTMLAudioElement | null = null;

export function loadAlarmSound(): void {
  if (typeof window === "undefined") return;
  if (!audio) {
    audio = new Audio("/alarm.wav");
    audio.loop = true;
    audio.preload = "auto";
  }
}

export function releaseAlarmSound(): void {
  stopAlarm();
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
}
