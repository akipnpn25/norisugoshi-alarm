"use client";

import { Settings, Moon, Sun, Headphones, Volume2, Check, Play, Bookmark, ChevronRight } from "lucide-react";

import { Card } from "@/src/components/ui/card";
import { HeadphoneCheckCard } from "@/src/components/HeadphoneCheckCard";
import type { Theme } from "@/src/lib/types";
import { ALARM_SOUNDS, type AlarmSoundId } from "@/src/lib/sound";

interface SettingsScreenProps {
  theme: Theme;
  onToggleTheme: () => void;
  earphoneChecked: boolean;
  earphoneConnected: boolean;
  routeName: string;
  onHeadphoneCheckEnd: (connected: boolean, name: string, error: string | null) => void;
  alarmSoundId: AlarmSoundId;
  onSelectAlarmSound: (id: AlarmSoundId) => void;
  quickSettingNames: string[];
  recurringScheduleCount: number;
  onOpenMySettings: () => void;
}

export function SettingsScreen({
  theme,
  onToggleTheme,
  earphoneChecked,
  earphoneConnected,
  routeName,
  onHeadphoneCheckEnd,
  alarmSoundId,
  onSelectAlarmSound,
  quickSettingNames,
  recurringScheduleCount,
  onOpenMySettings,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto min-h-full max-w-md px-5 pb-6 pt-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <Settings className="text-moon" size={28} />
          設定
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          保存設定・テーマ・アラーム音・出力先確認
        </p>
      </div>

      {/* マイ設定 */}
      <p className="mb-3 text-base font-bold text-foreground flex items-center gap-1.5">
        <Bookmark size={18} className="text-moon" />
        マイ設定・繰り返し設定
      </p>
      <button
        type="button"
        onClick={onOpenMySettings}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-night-surface active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moon/15 text-moon">
          <Bookmark size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold text-foreground">
            保存設定を管理
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {quickSettingNames.length > 0
              ? quickSettingNames.slice(0, 3).join("・")
              : "マイ設定は手動、繰り返し設定は曜日で自動"}
          </span>
          {recurringScheduleCount > 0 && (
            <span className="mt-1 block text-[11px] font-bold text-moon">
              繰り返し設定 {recurringScheduleCount}件
            </span>
          )}
        </span>
        <ChevronRight size={18} className="shrink-0 text-moon" />
      </button>

      {/* テーマ */}
      <p className="mb-3 mt-6 text-base font-bold text-foreground">テーマ</p>
      <button
        onClick={onToggleTheme}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-night-surface"
      >
        {theme === "night" ? (
          <Moon size={22} className="text-moon" />
        ) : (
          <Sun size={22} className="text-moon" />
        )}
        <span className="flex-1 text-left text-base font-bold text-foreground">
          {theme === "night" ? "ナイトモード" : "デイモード"}
        </span>
        <span className="text-[13px] text-muted-foreground">タップで切替</span>
      </button>

      {/* アラーム音 */}
      <p className="mb-3 mt-6 text-base font-bold text-foreground flex items-center gap-1.5">
        <Volume2 size={18} className="text-moon" />
        アラーム音
      </p>
      <div className="grid grid-cols-1 gap-2">
        {ALARM_SOUNDS.map((s) => {
          const selected = s.id === alarmSoundId;
          return (
            <button
              key={s.id}
              onClick={() => onSelectAlarmSound(s.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
                selected
                  ? "border-moon/60 bg-moon/12"
                  : "border-border bg-card hover:bg-night-surface"
              }`}
            >
              <span className="flex-1">
                <span className="block text-[15px] font-bold text-foreground">
                  {s.label}
                </span>
                <span className="block text-[12px] text-muted-foreground">
                  {s.description}
                </span>
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                  selected
                    ? "bg-moon text-night-deep"
                    : "bg-night-surface text-muted-foreground"
                }`}
              >
                {selected ? <Check size={16} /> : <Play size={16} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* 音の出力先確認 */}
      <p className="mb-3 mt-6 text-base font-bold text-foreground flex items-center gap-1.5">
        <Headphones size={18} className="text-moon" />
        音の出力先確認
      </p>
      <HeadphoneCheckCard
        checked={earphoneChecked}
        connected={earphoneConnected}
        routeName={routeName}
        onCheckEnd={onHeadphoneCheckEnd}
      />

      {/* 説明 */}
      <Card className="mt-6 bg-card px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          イヤホンを確認できた場合は、その出力先を優先します。
          対応していないブラウザでは端末の音声出力設定に従うため、試し音で確認してください。
        </p>
      </Card>
    </div>
  );
}
