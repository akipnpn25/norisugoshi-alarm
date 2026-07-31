"use client";

import { useEffect, useRef, useState } from "react";

import { AlarmScreen } from "@/src/components/AlarmScreen";
import { BreakSetupScreen } from "@/src/components/BreakSetupScreen";
import { HistoryScreen } from "@/src/components/HistoryScreen";
import { HomeScreen } from "@/src/components/HomeScreen";
import { PhoneFrame } from "@/src/components/PhoneFrame";
import { RestScreen } from "@/src/components/RestScreen";
import { ScheduleScreen } from "@/src/components/ScheduleScreen";
import { ScheduleShortcut } from "@/src/components/ScheduleShortcut";
import { SettingsScreen } from "@/src/components/SettingsScreen";
import { SetupModeSwitch } from "@/src/components/SetupModeSwitch";
import { SetupScreen } from "@/src/components/SetupScreen";
import { TabBar } from "@/src/components/TabBar";
import { ensureAnonymousSession } from "@/src/lib/auth";
import {
  clearActiveAlarm,
  loadActiveAlarm,
  saveActiveAlarm,
} from "@/src/lib/alarm-storage";
import {
  BREAK_DURATION_OPTIONS,
  BREAK_END_LEAD_TIME,
  BREAK_STATION,
  DEFAULT_LEAD_TIME_ID,
  DEFAULT_WAKE_STYLE_ID,
  LEAD_TIMES,
  WAKE_STYLES,
} from "@/src/lib/data";
import { onAudioDeviceChange } from "@/src/lib/headphone";
import {
  ALARM_SOUNDS,
  getStoredAlarmSound,
  loadAlarmSound,
  playAlarm,
  playBreakWarning,
  previewSound,
  releaseAlarmSound,
  stopAlarm,
  storeAlarmSound,
  type AlarmSoundId,
} from "@/src/lib/sound";
import {
  addStation,
  fetchStations,
  recordStationUse,
  type StationRow,
} from "@/src/lib/stations";
import {
  getNextRecurringOccurrence,
  isScheduleNormallyForDate,
  loadRecurringSchedules,
  saveRecurringSchedules,
  toLocalDateKey,
} from "@/src/lib/schedule-storage";
import { supabase } from "@/src/lib/supabase";
import { calculateAlarmTime } from "@/src/lib/time";
import type {
  AlarmConfig,
  AlarmInput,
  BreakDurationOption,
  BreakInput,
  LeadTimeId,
  RecurringSchedule,
  RecurringScheduleOccurrence,
  Screen,
  SetupMode,
  Station,
  Tab,
  Theme,
  WakeStyleId,
} from "@/src/lib/types";
import {
  getStoredWakeStyle,
  storeWakeStyle,
} from "@/src/lib/wake-style";

function getDefaultArrival(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  d.setSeconds(0, 0);
  return d;
}

function getBreakDurationMinutes(input: BreakInput): number | null {
  const minutes =
    input.durationOption === "custom"
      ? Number.parseInt(input.customMinutes, 10)
      : input.durationOption;

  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 240
  ) {
    return null;
  }

  return minutes;
}

function getBreakDurationOption(
  minutes: number
): BreakDurationOption {
  const preset = BREAK_DURATION_OPTIONS.find(
    (option) => option === minutes
  );

  return preset ?? "custom";
}


interface AlarmTimingResult {
  alarmFiredAt: Date;
  firstInteractionAt: Date | null;
  stoppedAt: Date;
  reactionMs: number | null;
  stopMs: number;
}

function getSafeLeadTimeId(value: string): LeadTimeId {
  return LEAD_TIMES.some((item) => item.id === value)
    ? (value as LeadTimeId)
    : DEFAULT_LEAD_TIME_ID;
}

function buildRecurringAlarmConfig(
  occurrence: RecurringScheduleOccurrence,
  earphoneConnected: boolean
): AlarmConfig | null {
  const { schedule, triggerAt, targetAt } = occurrence;
  const wakeStyle =
    WAKE_STYLES.find(
      (style) => style.id === schedule.wakeStyleId
    ) ?? WAKE_STYLES[1];

  if (schedule.mode === "transit") {
    const leadTime =
      LEAD_TIMES.find(
        (item) => item.id === schedule.leadTimeId
      ) ?? LEAD_TIMES[1];

    return {
      mode: "transit",
      station: schedule.station,
      arrivalTime: targetAt,
      leadTime,
      wakeStyle,
      alarmTime: triggerAt,
      demoMode: {
        id: "normal",
        label: "通常",
        offsetSeconds: null,
      },
      earphoneConnected,
    };
  }

  return {
    mode: "break",
    station: BREAK_STATION,
    arrivalTime: targetAt,
    leadTime: BREAK_END_LEAD_TIME,
    wakeStyle,
    alarmTime: targetAt,
    demoMode: {
      id: "normal",
      label: "通常",
      offsetSeconds: null,
    },
    earphoneConnected,
    breakStartedAt: triggerAt,
    breakDurationMinutes: schedule.durationMinutes,
    breakWarningEnabled:
      schedule.warningEnabled &&
      schedule.durationMinutes > 5,
  };
}

async function createAlarmHistory(
  cfg: AlarmConfig,
  historyId: string
): Promise<void> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return;
  }

  const { error } = await supabase.from("alarm_history").insert({
    id: historyId,
    station_id: cfg.station.id,
    station_name: cfg.station.name,
    arrival_time: cfg.arrivalTime.toISOString(),
    alarm_time: cfg.alarmTime.toISOString(),
    lead_time_minutes: cfg.leadTime.minutesBefore,
    demo_mode: cfg.demoMode.id,
    earphone_connected: cfg.earphoneConnected,
    wake_style: cfg.wakeStyle.id,
    mode: cfg.mode,
    duration_minutes:
      cfg.mode === "break"
        ? cfg.breakDurationMinutes ?? null
        : null,
    warning_minutes_before:
      cfg.mode === "break" && cfg.breakWarningEnabled
        ? 5
        : null,
    started_at:
      cfg.mode === "break"
        ? cfg.breakStartedAt?.toISOString() ?? null
        : null,
    status: "set",
  });

  if (error) {
    console.warn("履歴の作成に失敗:", error);
  }
}

async function updateAlarmHistoryStatus(
  historyId: string,
  status: "fired" | "cancelled",
  timing?: AlarmTimingResult
): Promise<void> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return;
  }

  const updates: Record<string, unknown> = {
    status,
  };

  if (timing) {
    updates.alarm_fired_at =
      timing.alarmFiredAt.toISOString();
    updates.first_interaction_at =
      timing.firstInteractionAt?.toISOString() ?? null;
    updates.stopped_at =
      timing.stoppedAt.toISOString();
    updates.reaction_ms = timing.reactionMs;
    updates.stop_ms = timing.stopMs;
  }

  const { error } = await supabase
    .from("alarm_history")
    .update(updates)
    .eq("id", historyId);

  if (error) {
    console.warn("履歴の更新に失敗:", error);
  }
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("alarm");
  const [theme, setTheme] = useState<Theme>("night");
  const [config, setConfig] = useState<AlarmConfig | null>(null);
  const [screen, setScreen] = useState<Screen>("rest");
  const [setupMode, setSetupMode] =
    useState<SetupMode>("transit");
  const [showSchedules, setShowSchedules] =
    useState(false);
  const [recurringSchedules, setRecurringSchedules] =
    useState<RecurringSchedule[]>([]);
  const [schedulesReady, setSchedulesReady] =
    useState(false);

  const [input, setInput] = useState<AlarmInput>({
    station: null,
    arrivalTime: getDefaultArrival(),
    leadTimeId: DEFAULT_LEAD_TIME_ID,
    wakeStyleId: DEFAULT_WAKE_STYLE_ID,
  });

  const [breakInput, setBreakInput] = useState<BreakInput>({
    durationOption: 15,
    customMinutes: "25",
    warningEnabled: true,
    wakeStyleId: DEFAULT_WAKE_STYLE_ID,
  });

  const [alarmSoundId, setAlarmSoundId] =
    useState<AlarmSoundId>("radial");
  const [earphoneConnected, setEarphoneConnected] =
    useState(false);
  const [earphoneChecked, setEarphoneChecked] =
    useState(false);
  const [routeName, setRouteName] = useState("");
  const [stations, setStations] = useState<StationRow[]>([]);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const recurringTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const recurringActionRef =
    useRef<(occurrence: RecurringScheduleOccurrence) => void>(
      () => {}
    );
  const historyIdRef = useRef<string | null>(null);
  const historyInsertRef =
    useRef<Promise<void> | null>(null);
  const alarmFiredAtRef = useRef<Date | null>(null);
  const firstInteractionAtRef =
    useRef<Date | null>(null);

  const clearScheduleTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  };

  useEffect(() => {
    setAlarmSoundId(getStoredAlarmSound());
    setRecurringSchedules(loadRecurringSchedules());
    setSchedulesReady(true);
    setInput((prev) => ({
      ...prev,
      wakeStyleId: getStoredWakeStyle("transit"),
    }));
    setBreakInput((prev) => ({
      ...prev,
      wakeStyleId: getStoredWakeStyle("break"),
    }));
    loadAlarmSound();
    void refreshStations();

    return () => {
      releaseAlarmSound();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }

      if (recurringTimerRef.current) {
        clearTimeout(recurringTimerRef.current);
      }
    };
  }, []);

  const refreshStations = async () => {
    const rows = await fetchStations();
    setStations(rows);
  };

  useEffect(() => {
    if (!schedulesReady) return;
    saveRecurringSchedules(recurringSchedules);
  }, [recurringSchedules, schedulesReady]);

  useEffect(() => {
    const unsubscribe = onAudioDeviceChange((route) => {
      setEarphoneConnected((prevConnected) => {
        if (!earphoneChecked) return prevConnected;
        if (route.connected === prevConnected) {
          return prevConnected;
        }
        if (route.connected) setRouteName(route.name);
        return route.connected;
      });
    });

    return unsubscribe;
  }, [earphoneChecked]);

  const fireAlarm = (cfg: AlarmConfig) => {
    const alarmFiredAt =
      cfg.alarmFiredAt ?? new Date();
    const activeConfig: AlarmConfig = {
      ...cfg,
      alarmFiredAt,
      firstInteractionAt:
        cfg.firstInteractionAt,
    };

    alarmFiredAtRef.current = alarmFiredAt;
    firstInteractionAtRef.current =
      cfg.firstInteractionAt ?? null;
    setConfig(activeConfig);

    const historyId = historyIdRef.current;

    if (historyId) {
      saveActiveAlarm(activeConfig, historyId);
    }

    playAlarm(undefined, cfg.wakeStyle.id);
    setScreen("alarm");
  };

  const scheduleAlarm = (cfg: AlarmConfig) => {
    clearScheduleTimers();

    const now = Date.now();

    if (
      cfg.mode === "break" &&
      cfg.breakWarningEnabled
    ) {
      const warningAt =
        cfg.alarmTime.getTime() - 5 * 60 * 1000;
      const warningDelay = warningAt - now;

      if (warningDelay > 0) {
        warningTimerRef.current = setTimeout(() => {
          warningTimerRef.current = null;
          playBreakWarning();
        }, warningDelay);
      }
    }

    const delay = cfg.alarmTime.getTime() - now;

    if (delay <= 0) {
      fireAlarm(cfg);
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fireAlarm(cfg);
    }, delay);
  };

  useEffect(() => {
    const storedAlarm = loadActiveAlarm();

    if (!storedAlarm) return;

    const {
      config: restoredConfig,
      historyId,
    } = storedAlarm;

    historyIdRef.current = historyId;
    historyInsertRef.current = null;
    alarmFiredAtRef.current =
      restoredConfig.alarmFiredAt ?? null;
    firstInteractionAtRef.current =
      restoredConfig.firstInteractionAt ?? null;
    setSetupMode(
      restoredConfig.mode === "break"
        ? "break"
        : "transit"
    );

    if (restoredConfig.mode === "break") {
      const duration =
        restoredConfig.breakDurationMinutes ?? 15;

      setBreakInput({
        durationOption: getBreakDurationOption(duration),
        customMinutes: String(duration),
        warningEnabled: Boolean(
          restoredConfig.breakWarningEnabled
        ),
        wakeStyleId: restoredConfig.wakeStyle.id,
      });
    } else {
      setInput({
        station: restoredConfig.station,
        arrivalTime: restoredConfig.arrivalTime,
        leadTimeId: restoredConfig.leadTime.id,
        wakeStyleId: restoredConfig.wakeStyle.id,
      });
    }

    setEarphoneConnected(
      restoredConfig.earphoneConnected
    );
    setEarphoneChecked(true);
    setConfig(restoredConfig);
    setScreen("rest");
    scheduleAlarm(restoredConfig);
    setTab("active");
  }, []);

  const handleInputChange = (
    patch: Partial<AlarmInput>
  ) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const handleBreakInputChange = (
    patch: Partial<BreakInput>
  ) => {
    setBreakInput((prev) => ({ ...prev, ...patch }));
  };

  const handleWakeStyleChange = (
    wakeStyleId: WakeStyleId
  ) => {
    setInput((prev) => ({ ...prev, wakeStyleId }));
    storeWakeStyle("transit", wakeStyleId);
  };

  const handleBreakWakeStyleChange = (
    wakeStyleId: WakeStyleId
  ) => {
    setBreakInput((prev) => ({
      ...prev,
      wakeStyleId,
    }));
    storeWakeStyle("break", wakeStyleId);
  };

  const handleHeadphoneCheckEnd = (
    connected: boolean,
    name: string,
    _error: string | null
  ) => {
    setEarphoneConnected(connected);
    setEarphoneChecked(true);
    setRouteName(name);
  };

  const commitAlarm = (cfg: AlarmConfig) => {
    if (historyIdRef.current) return;

    alarmFiredAtRef.current = null;
    firstInteractionAtRef.current = null;
    setEarphoneConnected(cfg.earphoneConnected);
    setEarphoneChecked(true);
    setConfig(cfg);
    setScreen("rest");

    const historyId = crypto.randomUUID();
    historyIdRef.current = historyId;
    historyInsertRef.current =
      createAlarmHistory(cfg, historyId);
    saveActiveAlarm(cfg, historyId);
    scheduleAlarm(cfg);

    if (cfg.mode === "transit") {
      void recordStationUse(cfg.station.id).then(
        refreshStations
      );
    }

    setTab("active");
  };


recurringActionRef.current = (
  occurrence: RecurringScheduleOccurrence
) => {
  if (historyIdRef.current) return;

  const recurringConfig = buildRecurringAlarmConfig(
    occurrence,
    earphoneConnected
  );

  if (!recurringConfig) return;

  setSetupMode(occurrence.schedule.mode);
  setShowSchedules(false);
  commitAlarm(recurringConfig);
};

useEffect(() => {
  if (
    !schedulesReady ||
    config !== null ||
    screen === "alarm"
  ) {
    return;
  }

  if (recurringTimerRef.current) {
    clearTimeout(recurringTimerRef.current);
    recurringTimerRef.current = null;
  }

  const occurrence = getNextRecurringOccurrence(
    recurringSchedules
  );

  if (!occurrence) return;

  const delay =
    occurrence.triggerAt.getTime() - Date.now();

  if (delay <= 0) {
    recurringActionRef.current(occurrence);
    return;
  }

  recurringTimerRef.current = setTimeout(() => {
    recurringTimerRef.current = null;
    recurringActionRef.current(occurrence);
  }, delay);

  return () => {
    if (recurringTimerRef.current) {
      clearTimeout(recurringTimerRef.current);
      recurringTimerRef.current = null;
    }
  };
}, [
  config,
  recurringSchedules,
  schedulesReady,
  screen,
]);

const handleSaveRecurringSchedule = (
  schedule: RecurringSchedule
) => {
  setRecurringSchedules((current) => {
    const exists = current.some(
      (item) => item.id === schedule.id
    );

    return exists
      ? current.map((item) =>
          item.id === schedule.id ? schedule : item
        )
      : [...current, schedule];
  });
};

const handleDeleteRecurringSchedule = (
  scheduleId: string
) => {
  setRecurringSchedules((current) =>
    current.filter(
      (schedule) => schedule.id !== scheduleId
    )
  );
};

const handleToggleRecurringSchedule = (
  scheduleId: string
) => {
  setRecurringSchedules((current) =>
    current.map((schedule) =>
      schedule.id === scheduleId
        ? {
            ...schedule,
            enabled: !schedule.enabled,
            updatedAt: new Date().toISOString(),
          }
        : schedule
    )
  );
};

const handleToggleTodaySkip = (
  scheduleId: string
) => {
  const today = new Date();
  const todayKey = toLocalDateKey(today);

  setRecurringSchedules((current) =>
    current.map((schedule) => {
      if (
        schedule.id !== scheduleId ||
        !isScheduleNormallyForDate(
          schedule,
          today
        )
      ) {
        return schedule;
      }

      const skipped =
        schedule.skippedDates.includes(todayKey);

      return {
        ...schedule,
        skippedDates: skipped
          ? schedule.skippedDates.filter(
              (date) => date !== todayKey
            )
          : [...schedule.skippedDates, todayKey],
        updatedAt: new Date().toISOString(),
      };
    })
  );
};

  const handleSetRealAlarm = () => {
    if (!input.station) return;

    const leadTime =
      LEAD_TIMES.find(
        (item) => item.id === input.leadTimeId
      ) ?? LEAD_TIMES[1];
    const alarmTime = calculateAlarmTime(
      input.arrivalTime,
      leadTime
    );
    const wakeStyle =
      WAKE_STYLES.find(
        (style) => style.id === input.wakeStyleId
      ) ?? WAKE_STYLES[1];

    const cfg: AlarmConfig = {
      mode: "transit",
      station: input.station,
      arrivalTime: input.arrivalTime,
      leadTime,
      wakeStyle,
      alarmTime,
      demoMode: {
        id: "normal",
        label: "通常",
        offsetSeconds: null,
      },
      earphoneConnected,
    };

    commitAlarm(cfg);
  };

  const handleSetBreak = () => {
    const durationMinutes =
      getBreakDurationMinutes(breakInput);

    if (durationMinutes === null) return;

    const breakStartedAt = new Date();
    const alarmTime = new Date(
      breakStartedAt.getTime() +
        durationMinutes * 60 * 1000
    );
    const wakeStyle =
      WAKE_STYLES.find(
        (style) => style.id === breakInput.wakeStyleId
      ) ?? WAKE_STYLES[1];

    const cfg: AlarmConfig = {
      mode: "break",
      station: BREAK_STATION,
      arrivalTime: alarmTime,
      leadTime: BREAK_END_LEAD_TIME,
      wakeStyle,
      alarmTime,
      demoMode: {
        id: "normal",
        label: "通常",
        offsetSeconds: null,
      },
      earphoneConnected,
      breakStartedAt,
      breakDurationMinutes: durationMinutes,
      breakWarningEnabled:
        breakInput.warningEnabled &&
        durationMinutes > 5,
    };

    commitAlarm(cfg);
  };

  const finishHistory = (
    status: "fired" | "cancelled",
    timing?: AlarmTimingResult
  ) => {
    const historyId = historyIdRef.current;
    const insertPromise = historyInsertRef.current;

    historyIdRef.current = null;
    historyInsertRef.current = null;
    clearActiveAlarm();

    if (historyId) {
      void (async () => {
        if (insertPromise) await insertPromise;
        await updateAlarmHistoryStatus(
          historyId,
          status,
          timing
        );
      })();
    }
  };

  const handleFirstInteraction = () => {
    if (firstInteractionAtRef.current) return;

    const firstInteractionAt = new Date();
    firstInteractionAtRef.current = firstInteractionAt;

    setConfig((current) => {
      if (!current) return current;

      const nextConfig: AlarmConfig = {
        ...current,
        firstInteractionAt,
      };
      const historyId = historyIdRef.current;

      if (historyId) {
        saveActiveAlarm(nextConfig, historyId);
      }

      return nextConfig;
    });
  };

  const handleCancel = () => {
    clearScheduleTimers();
    stopAlarm();
    finishHistory("cancelled");
    alarmFiredAtRef.current = null;
    firstInteractionAtRef.current = null;
    setConfig(null);
    setScreen("rest");
    setTab("alarm");
  };

  const handleStop = () => {
    const stoppedAt = new Date();
    const alarmFiredAt = alarmFiredAtRef.current;
    const firstInteractionAt =
      firstInteractionAtRef.current;

    clearScheduleTimers();
    stopAlarm();

    const timing = alarmFiredAt
      ? {
          alarmFiredAt,
          firstInteractionAt,
          stoppedAt,
          reactionMs: firstInteractionAt
            ? Math.max(
                0,
                Math.round(
                  firstInteractionAt.getTime() -
                    alarmFiredAt.getTime()
                )
              )
            : null,
          stopMs: Math.max(
            0,
            Math.round(
              stoppedAt.getTime() -
                alarmFiredAt.getTime()
            )
          ),
        }
      : undefined;

    finishHistory("fired", timing);
    alarmFiredAtRef.current = null;
    firstInteractionAtRef.current = null;
    setConfig(null);
    setScreen("rest");
    setShowSchedules(false);
    setTab("alarm");
  };

  const handleTabChange = (next: Tab) => {
    if (screen === "alarm") return;
    if (next !== "alarm") setShowSchedules(false);
    setTab(next);
  };

  const toggleTheme = () =>
    setTheme((current) =>
      current === "night" ? "day" : "night"
    );

  const handleSelectAlarmSound = (
    id: AlarmSoundId
  ) => {
    setAlarmSoundId(id);
    storeAlarmSound(id);
    previewSound(id);
  };

  const alarmSoundLabel =
    ALARM_SOUNDS.find(
      (sound) => sound.id === alarmSoundId
    )?.label ?? "ラジアル";

  const handleSelectStation = (id: string) => {
    const station = stations.find(
      (item) => item.id === id
    );

    if (station) {
      setShowSchedules(false);
      setSetupMode("transit");
      setInput((prev) => ({
        ...prev,
        station,
      }));
      void recordStationUse(id).then(
        refreshStations
      );
      setTab("alarm");
    }
  };

  const handleAddStation = async (name: string) => {
    const row = await addStation(name);

    if (row) {
      await refreshStations();
      setInput((prev) => ({
        ...prev,
        station: row,
      }));
    }
  };

  const handleSelectStationRow = (
    station: Station
  ) => {
    setInput((prev) => ({
      ...prev,
      station,
    }));
    void recordStationUse(station.id).then(
      refreshStations
    );
  };

  const showTabBar = screen !== "alarm";

  return (
    <PhoneFrame
      earphoneConnected={earphoneConnected}
      earphoneChecked={earphoneChecked}
      theme={theme}
      footer={
        showTabBar ? (
          <TabBar
            active={tab}
            onChange={handleTabChange}
            hasActiveAlarm={config !== null}
          />
        ) : null
      }
    >
      <main className="min-h-full">
        {screen === "alarm" && config ? (
          <AlarmScreen
            config={config}
            onFirstInteraction={
              handleFirstInteraction
            }
            onStop={handleStop}
          />
        ) : (
          <>
            {tab === "home" && (
              <HomeScreen
                earphoneConnected={earphoneConnected}
                earphoneChecked={earphoneChecked}
                stations={stations}
                alarmSoundLabel={alarmSoundLabel}
                onGoToAlarm={() => setTab("alarm")}
                onGoToSettings={() =>
                  setTab("settings")
                }
                onSelectStation={handleSelectStation}
              />
            )}

            {tab === "alarm" &&
              (showSchedules ? (
                <ScheduleScreen
                  schedules={recurringSchedules}
                  stations={stations}
                  defaultMode={setupMode}
                  transitDefaults={{
                    station: input.station,
                    arrivalHour:
                      input.arrivalTime.getHours(),
                    arrivalMinute:
                      input.arrivalTime.getMinutes(),
                    leadTimeId: getSafeLeadTimeId(
                      input.leadTimeId
                    ),
                    wakeStyleId: input.wakeStyleId,
                  }}
                  breakDefaults={{
                    durationMinutes:
                      getBreakDurationMinutes(
                        breakInput
                      ) ?? 15,
                    warningEnabled:
                      breakInput.warningEnabled,
                    wakeStyleId:
                      breakInput.wakeStyleId,
                  }}
                  onSave={
                    handleSaveRecurringSchedule
                  }
                  onDelete={
                    handleDeleteRecurringSchedule
                  }
                  onToggleEnabled={
                    handleToggleRecurringSchedule
                  }
                  onToggleTodaySkip={
                    handleToggleTodaySkip
                  }
                  onClose={() =>
                    setShowSchedules(false)
                  }
                />
              ) : (
                <>
                  <SetupModeSwitch
                    mode={setupMode}
                    onChange={setSetupMode}
                  />
                  <ScheduleShortcut
                    schedules={recurringSchedules}
                    onOpen={() =>
                      setShowSchedules(true)
                    }
                  />

                  {setupMode === "transit" ? (
                    <SetupScreen
                      input={input}
                      onInputChange={
                        handleInputChange
                      }
                      onWakeStyleChange={
                        handleWakeStyleChange
                      }
                      earphoneChecked={
                        earphoneChecked
                      }
                      earphoneConnected={
                        earphoneConnected
                      }
                      routeName={routeName}
                      stations={stations}
                      onSetAlarm={
                        handleSetRealAlarm
                      }
                      onHeadphoneCheckEnd={
                        handleHeadphoneCheckEnd
                      }
                      onSelectStation={
                        handleSelectStationRow
                      }
                      onAddStation={
                        handleAddStation
                      }
                    />
                  ) : (
                    <BreakSetupScreen
                      input={breakInput}
                      onInputChange={
                        handleBreakInputChange
                      }
                      onWakeStyleChange={
                        handleBreakWakeStyleChange
                      }
                      earphoneChecked={
                        earphoneChecked
                      }
                      earphoneConnected={
                        earphoneConnected
                      }
                      routeName={routeName}
                      onSetBreak={handleSetBreak}
                      onHeadphoneCheckEnd={
                        handleHeadphoneCheckEnd
                      }
                    />
                  )}
                </>
              ))}

            {tab === "active" &&
              (config ? (
                <RestScreen
                  config={config}
                  onCancel={handleCancel}
                />
              ) : (
                <NoActiveAlarm
                  onGoToAlarm={() =>
                    setTab("alarm")
                  }
                />
              ))}

            {tab === "history" && (
              <HistoryScreen />
            )}

            {tab === "settings" && (
              <SettingsScreen
                theme={theme}
                onToggleTheme={toggleTheme}
                earphoneChecked={earphoneChecked}
                earphoneConnected={
                  earphoneConnected
                }
                routeName={routeName}
                onHeadphoneCheckEnd={
                  handleHeadphoneCheckEnd
                }
                alarmSoundId={alarmSoundId}
                onSelectAlarmSound={
                  handleSelectAlarmSound
                }
              />
            )}
          </>
        )}
      </main>
    </PhoneFrame>
  );
}

function NoActiveAlarm({
  onGoToAlarm,
}: {
  onGoToAlarm: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <p className="text-base text-muted-foreground">
        現在アラームは設定されていません
      </p>
      <button
        onClick={onGoToAlarm}
        className="mt-4 rounded-2xl bg-moon px-6 py-3 text-base font-bold text-night-deep transition-opacity hover:opacity-90"
      >
        アラームを設定する
      </button>
    </div>
  );
}
