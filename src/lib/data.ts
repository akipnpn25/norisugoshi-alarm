import type {
  BreakDurationOption,
  LeadTimeOption,
  Station,
  WakeStyleOption,
} from "./types";

export const LEAD_TIMES: LeadTimeOption[] = [
  { id: "3min", label: "3分前", minutesBefore: 3 },
  { id: "5min", label: "5分前", minutesBefore: 5 },
  { id: "10min", label: "10分前", minutesBefore: 10 },
];

export const DEFAULT_LEAD_TIME_ID = "5min";

export const WAKE_STYLES: WakeStyleOption[] = [
  {
    id: "gentle",
    label: "やさしく",
    description: "控えめな音で鳴らし、タップで停止します",
  },
  {
    id: "standard",
    label: "しっかり",
    description: "10秒ごとに強くなり、タップで停止します",
  },
  {
    id: "strong",
    label: "絶対に起きたい",
    description: "短い間隔で強くなり、スライドで停止します",
  },
];

export const DEFAULT_WAKE_STYLE_ID = "standard";

export const BREAK_DURATION_OPTIONS: Exclude<
  BreakDurationOption,
  "custom"
>[] = [10, 15, 30, 60];

export const BREAK_STATION: Station = {
  id: "break",
  name: "休憩",
  kana: "きゅうけい",
};

export const TRANSIT_ARRIVAL_LEAD_TIME: LeadTimeOption = {
  id: "0min",
  label: "到着時刻",
  minutesBefore: 0,
};

export const BREAK_END_LEAD_TIME: LeadTimeOption = {
  id: "0min",
  label: "終了時刻",
  minutesBefore: 0,
};
