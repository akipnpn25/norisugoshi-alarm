"use client";

import { useEffect, useRef, useState } from "react";

import { HomeScreen } from "@/src/components/HomeScreen";
import { SetupScreen } from "@/src/components/SetupScreen";
import { RestScreen } from "@/src/components/RestScreen";
import { AlarmScreen } from "@/src/components/AlarmScreen";
import { HistoryScreen } from "@/src/components/HistoryScreen";
import { SettingsScreen } from "@/src/components/SettingsScreen";
import { TabBar } from "@/src/components/TabBar";
import { PhoneFrame } from "@/src/components/PhoneFrame";
import { DEFAULT_LEAD_TIME_ID, LEAD_TIMES } from "@/src/lib/data";
import type { AlarmConfig, AlarmInput, Screen, Station, Tab, Theme } from "@/src/lib/types";
import { supabase } from "@/src/lib/supabase";
import { ensureAnonymousSession } from "@/src/lib/auth";
import {
  clearActiveAlarm,
  loadActiveAlarm,
  saveActiveAlarm,
} from "@/src/lib/alarm-storage";
import {
  addStation,
  fetchStations,
  recordStationUse,
  type StationRow,
} from "@/src/lib/stations";
import { onAudioDeviceChange } from "@/src/lib/headphone";
import {
  ALARM_SOUNDS,
  getStoredAlarmSound,
  loadAlarmSound,
  playAlarm,
  previewSound,
  releaseAlarmSound,
  stopAlarm,
  storeAlarmSound,
  type AlarmSoundId,
} from "@/src/lib/sound";
import { calculateAlarmTime } from "@/src/lib/time";

function getDefaultArrival(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  d.setSeconds(0, 0);
  return d;
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
  // screen: "rest" = 実行中タブの中身, "alarm" = 鳴動画面
  const [screen, setScreen] = useState<Screen>("rest");

  const [input, setInput] = useState<AlarmInput>({
    station: null,
    arrivalTime: getDefaultArrival(),
    leadTimeId: DEFAULT_LEAD_TIME_ID,
  });

  const [alarmSoundId, setAlarmSoundId] = useState<AlarmSoundId>("radial");
  const [earphoneConnected, setEarphoneConnected] = useState(false);
  const [earphoneChecked, setEarphoneChecked] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [stations, setStations] = useState<StationRow[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyIdRef = useRef<string | null>(null);
  const historyInsertRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setAlarmSoundId(getStoredAlarmSound());
    loadAlarmSound();
    refreshStations();
    return () => {
      releaseAlarmSound();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const refreshStations = async () => {
    const rows = await fetchStations();
    setStations(rows);
  };

  // イヤホンの抜き差しをリアルタイム監視。一度でも確認済みなら状態を自動更新。
  useEffect(() => {
    const unsubscribe = onAudioDeviceChange((route) => {
      setEarphoneConnected((prevConnected) => {
        if (!earphoneChecked) return prevConnected;
        if (route.connected === prevConnected) return prevConnected;
        if (route.connected) setRouteName(route.name);
        return route.connected;
      });
    });
    return unsubscribe;
  }, [earphoneChecked]);

  const fireAlarm = () => {
    playAlarm();
    setScreen("alarm");
  };

  const scheduleAlarm = (cfg: AlarmConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = cfg.alarmTime.getTime() - Date.now();
    if (delay <= 0) {
      fireAlarm();
      return;
    }
    timerRef.current = setTimeout(() => fireAlarm(), delay);
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

    setInput({
      station: restoredConfig.station,
      arrivalTime: restoredConfig.arrivalTime,
      leadTimeId: restoredConfig.leadTime.id,
    });

    setEarphoneConnected(
      restoredConfig.earphoneConnected
    );
    setEarphoneChecked(true);
    setConfig(restoredConfig);
    setScreen("rest");
    scheduleAlarm(restoredConfig);
    setTab("active");
  }, []);

  const handleInputChange = (patch: Partial<AlarmInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
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
    // 連続クリックなどによる二重設定を防ぐ
    if (historyIdRef.current) return;

    setEarphoneConnected(cfg.earphoneConnected);
    setEarphoneChecked(true);
    setConfig(cfg);
    setScreen("rest");
    scheduleAlarm(cfg);
      const historyId = crypto.randomUUID();
      historyIdRef.current = historyId;
      historyInsertRef.current = createAlarmHistory(cfg, historyId);
      saveActiveAlarm(cfg, historyId);
    recordStationUse(cfg.station.id).then(refreshStations);
    setTab("active");
  };

  const handleSetRealAlarm = () => {
    if (!input.station) return;
    const leadTime =
      LEAD_TIMES.find((l) => l.id === input.leadTimeId) ?? LEAD_TIMES[1];
    const alarmTime = calculateAlarmTime(input.arrivalTime, leadTime);
    const cfg: AlarmConfig = {
      station: input.station,
      arrivalTime: input.arrivalTime,
      leadTime,
      alarmTime,
      demoMode: { id: "normal", label: "通常", offsetSeconds: null },
      earphoneConnected,
    };
    commitAlarm(cfg);
  };

  const handleCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopAlarm();
      const historyId = historyIdRef.current;
      const insertPromise = historyInsertRef.current;

      historyIdRef.current = null;
      historyInsertRef.current = null;
      clearActiveAlarm();

      if (historyId) {
        void (async () => {
          if (insertPromise) await insertPromise;
          await updateAlarmHistoryStatus(historyId, "cancelled");
        })();
      }
    setConfig(null);
    setTab("alarm");
  };

  const handleStop = () => {
    stopAlarm();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
      const historyId = historyIdRef.current;
      const insertPromise = historyInsertRef.current;

      historyIdRef.current = null;
      historyInsertRef.current = null;
      clearActiveAlarm();

      if (historyId) {
        void (async () => {
          if (insertPromise) await insertPromise;
          await updateAlarmHistoryStatus(historyId, "fired");
        })();
      }
    setConfig(null);
    setTab("home");
  };

  const handleTabChange = (next: Tab) => {
    if (screen === "alarm") return;
    setTab(next);
  };

  const toggleTheme = () => setTheme((t) => (t === "night" ? "day" : "night"));

  const handleSelectAlarmSound = (id: AlarmSoundId) => {
    setAlarmSoundId(id);
    storeAlarmSound(id);
    previewSound(id);
  };

  const alarmSoundLabel =
    ALARM_SOUNDS.find((s) => s.id === alarmSoundId)?.label ?? "ラジアル";

  const handleSelectStation = (id: string) => {
    const s = stations.find((x) => x.id === id);
    if (s) {
      setInput((prev) => ({ ...prev, station: s }));
      recordStationUse(id).then(refreshStations);
      setTab("alarm");
    }
  };

  const handleAddStation = async (name: string) => {
    const row = await addStation(name);
    if (row) {
      await refreshStations();
      setInput((prev) => ({ ...prev, station: row }));
    }
  };

  const handleSelectStationRow = (s: Station) => {
    setInput((prev) => ({ ...prev, station: s }));
    recordStationUse(s.id).then(refreshStations);
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
          <AlarmScreen config={config} onStop={handleStop} />
        ) : (
          <>
            {tab === "home" && (
              <HomeScreen
                earphoneConnected={earphoneConnected}
                earphoneChecked={earphoneChecked}
                stations={stations}
                alarmSoundLabel={alarmSoundLabel}
                onGoToAlarm={() => setTab("alarm")}
                onGoToSettings={() => setTab("settings")}
                onSelectStation={handleSelectStation}
              />
            )}
            {tab === "alarm" && (
              <SetupScreen
                input={input}
                onInputChange={handleInputChange}
                earphoneChecked={earphoneChecked}
                earphoneConnected={earphoneConnected}
                routeName={routeName}
                stations={stations}
                onSetAlarm={handleSetRealAlarm}
                onHeadphoneCheckEnd={handleHeadphoneCheckEnd}
                onSelectStation={handleSelectStationRow}
                onAddStation={handleAddStation}
              />
            )}
            {tab === "active" &&
              (config ? (
                <RestScreen config={config} onCancel={handleCancel} />
              ) : (
                <NoActiveAlarm onGoToAlarm={() => setTab("alarm")} />
              ))}
            {tab === "history" && <HistoryScreen />}
            {tab === "settings" && (
              <SettingsScreen
                theme={theme}
                onToggleTheme={toggleTheme}
                earphoneChecked={earphoneChecked}
                earphoneConnected={earphoneConnected}
                routeName={routeName}
                onHeadphoneCheckEnd={handleHeadphoneCheckEnd}
                alarmSoundId={alarmSoundId}
                onSelectAlarmSound={handleSelectAlarmSound}
              />
            )}
          </>
        )}
      </main>
    </PhoneFrame>
  );
}

function NoActiveAlarm({ onGoToAlarm }: { onGoToAlarm: () => void }) {
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
