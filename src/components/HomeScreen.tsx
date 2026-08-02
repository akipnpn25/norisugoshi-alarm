"use client";

import {
  Bell,
  Moon,
  Clock,
  ArrowRight,
  Music,
  Bookmark,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { WeeklyReportCard } from "@/src/components/WeeklyReportCard";
import type { Tab } from "@/src/lib/types";
import { ALARM_SOUNDS } from "@/src/lib/sound";

interface HomeScreenProps {
  earphoneConnected: boolean;
  earphoneChecked: boolean;
  alarmSoundLabel: string;
  onGoToAlarm: () => void;
  onGoToSettings: () => void;
}

export function HomeScreen({
  earphoneConnected,
  earphoneChecked,
  alarmSoundLabel,
  onGoToAlarm,
  onGoToSettings,
}: HomeScreenProps) {
  const steps = [
    {
      icon: <Bookmark size={18} />,
      text: "マイ設定を選ぶ、または到着時刻を設定",
    },
    { icon: <Clock size={18} />, text: "起こすタイミングを選ぶ" },
    {
      icon: <SlidersHorizontal size={18} />,
      text: "必要に応じて詳細設定を確認",
    },
    { icon: <Bell size={18} />, text: "アラームをセット" },
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

      <WeeklyReportCard />

      {/* 保存設定の違い */}
      <div className="mb-3 mt-7 flex items-center justify-between">
        <p className="text-base font-bold text-foreground">
          2つの保存方法
        </p>
        <button
          type="button"
          onClick={onGoToSettings}
          className="text-xs font-bold text-moon"
        >
          設定で管理
        </button>
      </div>
      <Card className="bg-card p-0">
        <div className="flex gap-3 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
            <Bookmark size={20} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">
              マイ設定
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              必要な日に、電車画面のボタンを自分で押して呼び出します。
            </p>
          </div>
        </div>
        <div className="mx-4 h-px bg-border" />
        <div className="flex gap-3 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
            <CalendarClock size={20} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">
              繰り返し設定
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              曜日を決めると、アプリを開いている間に指定時刻から自動で動きます。
            </p>
          </div>
        </div>
      </Card>

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
