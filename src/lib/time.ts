import type { DemoModeOption, LeadTimeOption } from "./types";

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTimeWithDay(
  date: Date,
  now: Date = new Date()
): string {
  const targetDay = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const currentDay = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDays = Math.round(
    (targetDay - currentDay) / 86400000
  );

  if (diffDays === 1) {
    return `明日 ${formatTime(date)}`;
  }

  if (diffDays !== 0) {
    return formatDateTime(date);
  }

  return formatTime(date);
}

export function calculateAlarmTime(
  arrival: Date,
  lead: LeadTimeOption
): Date {
  const t = new Date(arrival);
  t.setMinutes(t.getMinutes() - lead.minutesBefore);
  return t;
}

export function calculateDemoAlarmTime(
  demo: DemoModeOption
): Date | null {
  if (demo.offsetSeconds === null) {
    return null;
  }

  return new Date(Date.now() + demo.offsetSeconds * 1000);
}

export function minutesUntil(
  target: Date,
  now: Date = new Date()
): number {
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 60000)
  );
}

export function secondsUntil(
  target: Date,
  now: Date = new Date()
): number {
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 1000)
  );
}

export function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "0秒";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0
      ? `${hours}時間${minutes}分`
      : `${hours}時間`;
  }

  if (seconds === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${seconds}秒`;
}
export function isFuture(
  date: Date,
  now: Date = new Date()
): boolean {
  return date.getTime() > now.getTime();
}

export function formatDateTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");

  return `${month}/${day} ${h}:${m}`;
}