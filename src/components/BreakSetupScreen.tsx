"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { HeadphoneCheckCard } from "@/src/components/HeadphoneCheckCard";
import {
  BREAK_DURATION_OPTIONS,
  WAKE_STYLES,
} from "@/src/lib/data";
import type {
  BreakInput,
  WakeStyleId,
} from "@/src/lib/types";
import { formatTimeWithDay } from "@/src/lib/time";

interface BreakSetupScreenProps {
  input: BreakInput;
  onInputChange: (patch: Partial<BreakInput>) => void;
  onWakeStyleChange: (wakeStyleId: WakeStyleId) => void;
  earphoneChecked: boolean;
  earphoneConnected: boolean;
  routeName: string;
  onSetBreak: () => void;
  onHeadphoneCheckStart?: () => void;
  onHeadphoneCheckEnd: (
    connected: boolean,
    name: string,
    error: string | null
  ) => void;
}

export function BreakSetupScreen({
  input,
  onInputChange,
  onWakeStyleChange,
  earphoneChecked,
  earphoneConnected,
  routeName,
  onSetBreak,
  onHeadphoneCheckStart,
  onHeadphoneCheckEnd,
}: BreakSetupScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [choosingWakeStyle, setChoosingWakeStyle] = useState(false);
  const [choosingCustomDuration, setChoosingCustomDuration] =
    useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const customMinutes = Number.parseInt(input.customMinutes, 10);
  const validCustomMinutes =
    Number.isInteger(customMinutes) &&
    customMinutes >= 1 &&
    customMinutes <= 240;
  const durationMinutes =
    input.durationOption === "custom"
      ? customMinutes
      : input.durationOption;
  const validDuration =
    Number.isInteger(durationMinutes) &&
    durationMinutes >= 1 &&
    durationMinutes <= 240;
  const endTime = new Date(
    now.getTime() + (validDuration ? durationMinutes : 0) * 60000
  );
  const warningAvailable = validDuration && durationMinutes > 5;
  const wakeStyle =
    WAKE_STYLES.find((style) => style.id === input.wakeStyleId) ??
    WAKE_STYLES[1];
  const customDurationForPicker = validCustomMinutes
    ? customMinutes
    : 25;

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-3 animate-fade-in">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
          <Coffee className="text-moon" size={28} />
          休憩タイマー
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          短い休憩を、安心して過ごせるようにします。
        </p>
      </div>

      <SectionLabel
        num="1"
        text="休憩時間"
        icon={<Clock size={16} />}
      />
      <div className="grid grid-cols-4 gap-2">
        {BREAK_DURATION_OPTIONS.map((minutes) => {
          const selected = input.durationOption === minutes;

          return (
            <button
              key={minutes}
              type="button"
              onClick={() =>
                onInputChange({ durationOption: minutes })
              }
              className={`rounded-2xl border py-3.5 text-sm font-extrabold transition-all active:scale-95 ${
                selected
                  ? "border-moon bg-moon text-night-deep"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {minutes}分
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setChoosingCustomDuration(true)}
        className={`mt-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.99] ${
          input.durationOption === "custom"
            ? "border-moon bg-moon/10"
            : "border-border bg-card"
        }`}
        aria-haspopup="dialog"
      >
        <span className="flex-1">
          <span className="block text-sm font-extrabold text-foreground">
            {input.durationOption === "custom"
              ? `自由設定：${customDurationForPicker}分`
              : "自由に時間を設定"}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            1〜240分まで、1分単位で選べます
          </span>
        </span>
        <ChevronRight size={19} className="text-moon" />
      </button>

      {choosingCustomDuration && (
        <CustomDurationModal
          initialMinutes={customDurationForPicker}
          onClose={() => setChoosingCustomDuration(false)}
          onComplete={(minutes) => {
            onInputChange({
              durationOption: "custom",
              customMinutes: String(minutes),
              warningEnabled:
                minutes > 5 ? input.warningEnabled : false,
            });
            setChoosingCustomDuration(false);
          }}
        />
      )}

      <SectionLabel
        num="2"
        text="終了予定"
        icon={<Clock size={16} />}
      />
      <Card className="bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            休憩終了
          </span>
          <span className="text-2xl font-extrabold tabular-nums text-moon">
            {validDuration ? formatTimeWithDay(endTime, now) : "--:--"}
          </span>
        </div>
      </Card>

      <SectionLabel
        num="3"
        text="終了5分前の予告"
        icon={<Bell size={16} />}
      />
      <Card className="bg-card p-0">
        <button
          type="button"
          onClick={() => {
            if (!warningAvailable) return;
            onInputChange({
              warningEnabled: !input.warningEnabled,
            });
          }}
          disabled={!warningAvailable}
          aria-pressed={input.warningEnabled && warningAvailable}
          className="flex w-full items-center gap-4 px-4 py-4 text-left disabled:opacity-45"
        >
          <span className="flex-1">
            <span className="block text-base font-extrabold text-foreground">
              5分前に短い予告音を鳴らす
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              本アラームの前に、休憩の終了が近いことを知らせます。
            </span>
          </span>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              input.warningEnabled && warningAvailable
                ? "bg-moon"
                : "bg-night-surface"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                input.warningEnabled && warningAvailable
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </Card>
      {!warningAvailable && (
        <p className="mt-2 text-xs text-muted-foreground">
          5分以下の休憩では予告を使用できません。
        </p>
      )}

      <SectionLabel
        num="4"
        text="起こし方"
        icon={<Bell size={16} />}
      />
      <Card className="bg-card p-0">
        <button
          type="button"
          onClick={() =>
            setChoosingWakeStyle((open) => !open)
          }
          className="flex w-full items-center gap-3 px-4 py-4 text-left"
          aria-expanded={choosingWakeStyle}
        >
          <span className="flex-1">
            <span className="block text-base font-extrabold text-foreground">
              {wakeStyle.label}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {wakeStyle.description}
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-moon">
            変更
            {choosingWakeStyle ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </span>
        </button>

        {choosingWakeStyle && (
          <div className="border-t border-border px-3 pb-3 pt-2">
            {WAKE_STYLES.map((style) => {
              const selected = style.id === input.wakeStyleId;

              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    onWakeStyleChange(style.id);
                    setChoosingWakeStyle(false);
                  }}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                    selected
                      ? "border-moon bg-moon/15"
                      : "border-border bg-night-surface/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[15px] font-extrabold text-foreground">
                        {style.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {style.description}
                      </span>
                    </span>
                    {selected && (
                      <span className="shrink-0 text-xs font-bold text-moon">
                        選択中
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        休憩モードで前回選んだ起こし方を次回も使用します。
      </p>

      <SectionLabel
        num="5"
        text="音の出力先を確認（任意）"
        icon={<Bell size={16} />}
      />
      <HeadphoneCheckCard
        checked={earphoneChecked}
        connected={earphoneConnected}
        routeName={routeName}
        onCheckStart={onHeadphoneCheckStart}
        onCheckEnd={onHeadphoneCheckEnd}
      />

      <Card className="mt-3 border-moon/30 bg-moon/10 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          このWeb版は、端末をロックしたり別のアプリへ移動したりすると、
          予定時刻に鳴らない場合があります。休憩中はこの画面を
          開いたままにしてください。
        </p>
      </Card>

      <Button
        onClick={onSetBreak}
        disabled={!validDuration}
        size="lg"
        className="mt-5 w-full"
      >
        休憩を始める
      </Button>
    </div>
  );
}

const CUSTOM_MINUTES_MIN = 1;
const CUSTOM_MINUTES_MAX = 240;
const CUSTOM_MINUTE_ITEM_HEIGHT = 48;

function CustomDurationModal({
  initialMinutes,
  onClose,
  onComplete,
}: {
  initialMinutes: number;
  onClose: () => void;
  onComplete: (minutes: number) => void;
}) {
  const safeInitialMinutes = Math.min(
    CUSTOM_MINUTES_MAX,
    Math.max(CUSTOM_MINUTES_MIN, initialMinutes)
  );
  const [selectedMinutes, setSelectedMinutes] =
    useState(safeInitialMinutes);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      wheelRef.current?.scrollTo({
        top:
          (safeInitialMinutes - CUSTOM_MINUTES_MIN) *
          CUSTOM_MINUTE_ITEM_HEIGHT,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [safeInitialMinutes]);

  const scrollToMinutes = (minutes: number) => {
    wheelRef.current?.scrollTo({
      top:
        (minutes - CUSTOM_MINUTES_MIN) *
        CUSTOM_MINUTE_ITEM_HEIGHT,
      behavior: "smooth",
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-night-deep/80 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-moon/30 bg-night-card p-5 shadow-2xl animate-scale-in sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-duration-title"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3
              id="custom-duration-title"
              className="text-lg font-extrabold text-foreground"
            >
              自由に時間を設定
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              上下にスクロールして休憩時間を選びます
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mx-auto h-60 w-44 overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border-y border-moon/40 bg-moon/10" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-night-card to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-night-card to-transparent" />

          <div
            ref={wheelRef}
            onScroll={(event) => {
              const index = Math.round(
                event.currentTarget.scrollTop /
                  CUSTOM_MINUTE_ITEM_HEIGHT
              );
              const minutes = Math.min(
                CUSTOM_MINUTES_MAX,
                Math.max(
                  CUSTOM_MINUTES_MIN,
                  index + CUSTOM_MINUTES_MIN
                )
              );
              setSelectedMinutes(minutes);
            }}
            className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-hide"
            aria-label="休憩時間"
          >
            <div
              aria-hidden="true"
              style={{
                height: CUSTOM_MINUTE_ITEM_HEIGHT * 2,
              }}
            />
            {Array.from(
              {
                length:
                  CUSTOM_MINUTES_MAX -
                  CUSTOM_MINUTES_MIN +
                  1,
              },
              (_, index) => {
                const minutes =
                  CUSTOM_MINUTES_MIN + index;
                const selected =
                  minutes === selectedMinutes;

                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() =>
                      scrollToMinutes(minutes)
                    }
                    className={`flex h-12 w-full snap-center items-center justify-center gap-2 text-center tabular-nums transition-all ${
                      selected
                        ? "text-2xl font-extrabold text-moon"
                        : "text-lg font-bold text-muted-foreground/60"
                    }`}
                    aria-label={`${minutes}分`}
                    aria-current={selected ? "true" : undefined}
                  >
                    <span>{minutes}</span>
                    <span
                      className={`text-sm ${
                        selected
                          ? "text-moon"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      分
                    </span>
                  </button>
                );
              }
            )}
            <div
              aria-hidden="true"
              style={{
                height: CUSTOM_MINUTE_ITEM_HEIGHT * 2,
              }}
            />
          </div>
        </div>

        <p className="mt-2 text-center text-sm font-bold text-foreground">
          {selectedMinutes >= 60
            ? `${Math.floor(selectedMinutes / 60)}時間${
                selectedMinutes % 60
                  ? `${selectedMinutes % 60}分`
                  : ""
              }`
            : `${selectedMinutes}分`}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={() => onComplete(selectedMinutes)}
          >
            完了
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SectionLabel({
  num,
  text,
  icon,
}: {
  num: string;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2.5">
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-moon text-[13px] font-extrabold text-night-deep">
        {num}
      </div>
      <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
        {icon}
        {text}
      </span>
    </div>
  );
}
