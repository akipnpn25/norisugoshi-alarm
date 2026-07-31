"use client";

import { useEffect, useRef, useState } from "react";

import { AlarmScreen } from "@/src/components/AlarmScreen";
import { BreakSetupScreen } from "@/src/components/BreakSetupScreen";
import { HistoryScreen } from "@/src/components/HistoryScreen";
import { HomeScreen } from "@/src/components/HomeScreen";
import { PhoneFrame } from "@/src/components/PhoneFrame";
import { RestScreen } from "@/src/components/RestScreen";
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
import { supabase } from "@/src/lib/supabase";
import { calculateAlarmTime } from "@/src/lib/time";
import type {
  AlarmConfig,
  AlarmInput,
  BreakDurationOption,
  BreakInput,
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
  status: "fired" | "cancelled"
): Promise<void> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return;
  }

  const { error } = await supabase
    .from("alarm_history")
    .update({ status })
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
  const historyIdRef = useRef<string | null>(null);
  const historyInsertRef =
    useRef<Promise<void> | null>(null);

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
    };
  }, []);

  const refreshStations = async () => {
    const rows = await fetchStations();
    setStations(rows);
  };

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

    setEarphoneConnected(cfg.earphoneConnected);
    setEarphoneChecked(true);
    setConfig(cfg);
    setScreen("rest");
    scheduleAlarm(cfg);

    const historyId = crypto.randomUUID();
    historyIdRef.current = historyId;
    historyInsertRef.current =
      createAlarmHistory(cfg, historyId);
    saveActiveAlarm(cfg, historyId);

    if (cfg.mode === "transit") {
      void recordStationUse(cfg.station.id).then(
        refreshStations
      );
    }

    setTab("active");
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
    status: "fired" | "cancelled"
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
          status
        );
      })();
    }
  };

  const handleCancel = () => {
    clearScheduleTimers();
    stopAlarm();
    finishHistory("cancelled");
    setConfig(null);
    setScreen("rest");
    setTab("alarm");
  };

  const handleStop = () => {
    clearScheduleTimers();
    stopAlarm();
    finishHistory("fired");
    setConfig(null);
    setScreen("rest");
    setTab("home");
  };

  const handleTabChange = (next: Tab) => {
    if (screen === "alarm") return;
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

            {tab === "alarm" && (
              <>
                <SetupModeSwitch
                  mode={setupMode}
                  onChange={setSetupMode}
                />

                {setupMode === "transit" ? (
                  <SetupScreen
                    input={input}
                    onInputChange={handleInputChange}
                    onWakeStyleChange={
                      handleWakeStyleChange
                    }
                    earphoneChecked={earphoneChecked}
                    earphoneConnected={
                      earphoneConnected
                    }
                    routeName={routeName}
                    stations={stations}
                    onSetAlarm={handleSetRealAlarm}
                    onHeadphoneCheckEnd={
                      handleHeadphoneCheckEnd
                    }
                    onSelectStation={
                      handleSelectStationRow
                    }
                    onAddStation={handleAddStation}
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
                    earphoneChecked={earphoneChecked}
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
            )}

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
