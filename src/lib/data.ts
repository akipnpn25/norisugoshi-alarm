import type { LeadTimeOption, Station, WakeStyleOption } from "./types";

export const STATIONS: Station[] = [
  { id: "shinjuku", name: "新宿駅", kana: "しんじゅくえき" },
  { id: "shibuya", name: "渋谷駅", kana: "しぶやえき" },
  { id: "tokyo", name: "東京駅", kana: "とうきょうえき" },
  { id: "ikebukuro", name: "池袋駅", kana: "いけぶくろえき" },
  { id: "shinagawa", name: "品川駅", kana: "しながわえき" },
  { id: "shinbashi", name: "新橋駅", kana: "しんばしえき" },
  { id: "yurakucho", name: "有楽町駅", kana: "ゆうらくちょうえき" },
  { id: "akihabara", name: "秋葉原駅", kana: "あきはばらえき" },
  { id: "ueno", name: "上野駅", kana: "うえのえき" },
  { id: "kanda", name: "神田駅", kana: "かんだえき" },
  { id: "tokyo-stn", name: "東京タワー前", kana: "とうきょうたわーまえ" },
  { id: "hamamatsucho", name: "浜松町駅", kana: "はままつちょうえき" },
  { id: "tamachi", name: "田町駅", kana: "たまちえき" },
  { id: "ebisu", name: "恵比寿駅", kana: "えびすえき" },
  { id: "meguro", name: "目黒駅", kana: "めぐろえき" },
  { id: "gotanda", name: "五反田駅", kana: "ごたんだえき" },
  { id: "osaki", name: "大崎駅", kana: "おおさきえき" },
  { id: "kamata", name: "蒲田駅", kana: "かまたえき" },
];

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
    description: "10秒ごとに強くなり、長押しで停止します",
  },
  {
    id: "strong",
    label: "絶対に起きたい",
    description: "短い間隔で強くなり、スライドで停止します",
  },
];

export const DEFAULT_WAKE_STYLE_ID = "standard";
