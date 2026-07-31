"use client";

import { Bell, Moon, MapPin, Clock, ArrowRight, Plus, Music } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import type { Tab } from "@/src/lib/types";
import type { StationRow } from "@/src/lib/stations";

import { ALARM_SOUNDS } from "@/src/lib/sound";

interface HomeScreenProps {
  earphoneConnected: boolean;
  earphoneChecked: boolean;
  stations: StationRow[];
  alarmSoundLabel: string;
  onGoToAlarm: () => void;
  onGoToSettings: () => void;
  onSelectStation: (id: string) => void;
}

export function HomeScreen({
  earphoneConnected,
  earphoneChecked,
  stations,
  alarmSoundLabel,
  onGoToAlarm,
  onGoToSettings,
  onSelectStation,
}: HomeScreenProps) {
  const steps = [
    { icon: <MapPin size={18} />, text: "目的地を選ぶ" },
    { icon: <Clock size={18} />, text: "到着時刻を入力" },
    { icon: <Bell size={18} />, text: "音の出力先を試し音で確認" },
    { icon: <Music size={18} />, text: "設定でアラーム音を選ぶ" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-4 animate-fade-in">
      {/* ヒーロー */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-moon">
          <Moon size={24} />
          <span className="text-xs font-bold tracking-wider">NORISUGOSHI</span>
        </div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight text-foreground">
          乗り過ごしを
          <br />
          防ぐアラーム
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          イヤホンでも、本体スピーカーでも。
          <br />
          電車の仮眠に安心を。
        </p>
      </div>

      {/* アラーム音・出力先設定 */}
      <button
        onClick={onGoToSettings}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
          !earphoneChecked
            ? "border-border bg-card"
            : earphoneConnected
              ? "border-success/40 bg-success/10"
              : "border-moon/35 bg-moon/10"
        }`}
      >
        <Music
          size={24}
          className={
            !earphoneChecked
              ? "text-moon"
              : earphoneConnected
                ? "text-success"
                : "text-moon"
          }
        />
        <div className="flex-1 text-left">
          <p className="text-[13px] text-muted-foreground">アラーム音・出力先設定</p>
          <p
            className={`text-base font-bold ${
              !earphoneChecked
                ? "text-foreground"
                : earphoneConnected
                  ? "text-success"
                  : "text-moon"
            }`}
          >
            {!earphoneChecked
              ? `${alarmSoundLabel}・出力先未確認`
              : earphoneConnected
                ? `${alarmSoundLabel}・イヤホン`
                : `${alarmSoundLabel}・本体スピーカー`}
          </p>
        </div>
        <ArrowRight size={18} className="text-muted-foreground" />
      </button>

      {/* メインCTA */}
      <Button onClick={onGoToAlarm} size="lg" className="mt-4 w-full">
        <Bell size={18} className="mr-2" />
        アラームを設定する
      </Button>

      {/* よく使う駅（履歴順） */}
      <div className="mb-3 mt-7 flex items-center justify-between">
        <p className="text-base font-bold text-foreground">最近の駅</p>
        <span className="text-[11px] font-bold text-muted-foreground">履歴順</span>
      </div>
      <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
        {stations.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectStation(s.id)}
            className="shrink-0 rounded-2xl border border-border bg-card px-4 py-3 text-[14px] font-bold text-foreground transition-all hover:bg-night-surface active:scale-95"
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={onGoToAlarm}
          className="shrink-0 rounded-2xl border border-dashed border-moon/50 px-4 py-3 text-[14px] font-bold text-moon transition-all hover:bg-moon/10 active:scale-95"
        >
          <span className="flex items-center gap-1.5">
            <Plus size={15} />
            追加
          </span>
        </button>
      </div>

      {/* 使い方 */}
      <p className="mb-3 mt-7 text-base font-bold text-foreground">使い方</p>
      <Card className="bg-card">
        {steps.map((s, i) => (
          <div key={i}>
            {i > 0 && <div className="my-2.5 h-px bg-border" />}
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-moon text-[13px] font-extrabold text-night-deep">
                {i + 1}
              </div>
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-moon">{s.icon}</span>
                {s.text}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
