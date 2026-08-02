export type Screen = "setup" | "rest" | "alarm";

export type Tab = "home" | "alarm" | "active" | "history" | "settings";

export type Theme = "night" | "day";

export type AlarmMode = "transit" | "break" | "nap";
export type SetupMode = "transit" | "break";

export type WakeStyleId = "gentle" | "standard" | "strong";

export type AlarmSoundId =
  | "radial"
  | "arpeggio"
  | "twinkle"
  | "sunrise"
  | "crescent"
  | "aurora"
  | "horizon";

export interface WakeStyleOption {
  id: WakeStyleId;
  label: string;
  description: string;
}

export type LeadTimeId = "0min" | "3min" | "5min" | "10min";

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

export type BreakDurationOption = 10 | 15 | 30 | 60 | "custom";

export interface BreakInput {
  durationOption: BreakDurationOption;
  customMinutes: string;
  warningEnabled: boolean;
  wakeStyleId: WakeStyleId;
}

export interface AlarmConfig {
  mode: AlarmMode;
  station: Station;
  arrivalTime: Date;
  leadTime: LeadTimeOption;
  wakeStyle: WakeStyleOption;
  alarmTime: Date;
  demoMode: DemoModeOption;
  earphoneConnected: boolean;
  breakStartedAt?: Date;
  breakDurationMinutes?: number;
  breakWarningEnabled?: boolean;
  alarmFiredAt?: Date;
  firstInteractionAt?: Date;
  /** 現在鳴っている段階の起こし方。未設定時は wakeStyle を使う。 */
  activeWakeStyle?: WakeStyleOption;
  /** 段階アラームの進行状況。1=開始、2=強化、3=最終再通知。 */
  alarmStage?: 1 | 2 | 3;
}

export interface AlarmInput {
  station: Station | null;
  arrivalTime: Date;
  leadTimeId: string;
  wakeStyleId: WakeStyleId;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RepeatPattern = "daily" | "weekdays" | "custom";

export interface RecurringScheduleBase {
  id: string;
  enabled: boolean;
  repeatPattern: RepeatPattern;
  weekdays: Weekday[];
  skippedDates: string[];
  alarmSoundId: AlarmSoundId;
  createdAt: string;
  updatedAt: string;
}

export interface TransitRecurringSchedule
  extends RecurringScheduleBase {
  mode: "transit";
  station: Station;
  arrivalHour: number;
  arrivalMinute: number;
  leadTimeId: LeadTimeId;
  wakeStyleId: WakeStyleId;
}

export interface BreakRecurringSchedule
  extends RecurringScheduleBase {
  mode: "break";
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  warningEnabled: boolean;
  wakeStyleId: WakeStyleId;
}

export type RecurringSchedule =
  | TransitRecurringSchedule
  | BreakRecurringSchedule;

export interface QuickSettingBase {
  id: string;
  name: string;
  wakeStyleId: WakeStyleId;
  alarmSoundId: AlarmSoundId;
  createdAt: string;
  updatedAt: string;
}

export interface TransitQuickSetting extends QuickSettingBase {
  mode: "transit";
  station: Station;
  arrivalHour: number;
  arrivalMinute: number;
  leadTimeId: LeadTimeId;
}

export interface BreakQuickSetting extends QuickSettingBase {
  mode: "break";
  durationMinutes: number;
  warningEnabled: boolean;
}

export type QuickSetting =
  | TransitQuickSetting
  | BreakQuickSetting;

export interface RecurringScheduleOccurrence {
  schedule: RecurringSchedule;
  triggerAt: Date;
  targetAt: Date;
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
  wake_style: WakeStyleId | null;
  mode: AlarmMode | null;
  duration_minutes: number | null;
  warning_minutes_before: number | null;
  started_at: string | null;
  alarm_fired_at: string | null;
  first_interaction_at: string | null;
  stopped_at: string | null;
  reaction_ms: number | null;
  stop_ms: number | null;
  status: string;
  created_at: string;
}
