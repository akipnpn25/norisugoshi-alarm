export type Screen = "setup" | "rest" | "alarm";

export type Tab = "home" | "alarm" | "active" | "history" | "settings";

export type Theme = "night" | "day";

export type LeadTimeId = "3min" | "5min" | "10min";

export interface LeadTimeOption {
  id: LeadTimeId;
  label: string;
  minutesBefore: number;
}

export interface Station {
  id: string;
  name: string;
  kana: string;
}

export type DemoModeId = "normal" | "30s" | "1min";

export interface DemoModeOption {
  id: DemoModeId;
  label: string;
  /** seconds from now until the alarm fires; null = use real arrival time */
  offsetSeconds: number | null;
}

export interface AlarmConfig {
  station: Station;
  arrivalTime: Date;
  leadTime: LeadTimeOption;
  alarmTime: Date;
  demoMode: DemoModeOption;
  earphoneConnected: boolean;
}

export interface AlarmInput {
  station: Station | null;
  arrivalTime: Date;
  leadTimeId: string;
}

export interface AudioRoute {
  type: "headphones" | "receiver" | "speaker" | "bluetooth" | "unknown";
  name: string;
  connected: boolean;
}

export interface AlarmHistoryRow {
  id: string;
  station_name: string;
  arrival_time: string;
  alarm_time: string;
  lead_time_minutes: number;
  demo_mode: string;
  earphone_connected: boolean;
  status: string;
  created_at: string;
}
