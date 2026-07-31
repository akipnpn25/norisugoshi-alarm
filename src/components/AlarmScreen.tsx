"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Hand, Sun } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import type { AlarmConfig } from "@/src/lib/types";
import { formatTimeWithDay } from "@/src/lib/time";

interface AlarmScreenProps {
  config: AlarmConfig;
  onStop: () => void;
}

const HOLD_DURATION_MS = 1600;
const SLIDE_COMPLETE_VALUE = 94;

export function AlarmScreen({ config, onStop }: AlarmScreenProps) {
  const [pulse, setPulse] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [slideValue, setSlideValue] = useState(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartedAtRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 500);
    return () => clearInterval(id);
  }, []);

  const clearHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartedAtRef.current = null;
  };

  useEffect(() => {
    return () => clearHold();
  }, []);

  const finishStop = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearHold();
    onStop();
  };

  const startHold = () => {
    if (stoppingRef.current || holdIntervalRef.current) return;

    holdStartedAtRef.current = performance.now();
    setHoldProgress(0);

    holdIntervalRef.current = setInterval(() => {
      const startedAt = holdStartedAtRef.current;
      if (startedAt === null) return;

      const progress = Math.min(
        1,
        (performance.now() - startedAt) / HOLD_DURATION_MS
      );
      setHoldProgress(progress);

      if (progress >= 1) {
        finishStop();
      }
    }, 40);
  };

  const cancelHold = () => {
    if (stoppingRef.current) return;
    clearHold();
    setHoldProgress(0);
  };

  const handleSlide = (value: number) => {
    setSlideValue(value);
    if (value >= SLIDE_COMPLETE_VALUE) {
      finishStop();
    }
  };

  const resetSlide = () => {
    if (!stoppingRef.current && slideValue < SLIDE_COMPLETE_VALUE) {
      setSlideValue(0);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-7 py-8 animate-scale-in">
      <div
        className={`mb-7 flex h-32 w-32 items-center justify-center rounded-full bg-moon/12 transition-transform ${
          pulse ? "scale-110" : "scale-100"
        }`}
      >
        <Sun className="text-moon animate-pulse-glow" size={64} />
      </div>

      <p className="mb-2 rounded-full bg-moon/15 px-3 py-1.5 text-xs font-extrabold text-moon">
        {config.wakeStyle.label}
      </p>
      <h2 className="text-center text-3xl font-extrabold text-moon">
        おはよう！
      </h2>
      <p className="mt-3.5 text-center text-2xl font-extrabold text-foreground">
        まもなく{config.station.name}です
      </p>
      <p className="mt-2.5 text-base text-muted-foreground">
        {formatTimeWithDay(config.arrivalTime)} 到着予定
      </p>

      <div className="h-12" />

      {config.wakeStyle.id === "gentle" && (
        <>
          <Button
            onClick={finishStop}
            size="lg"
            className="w-full animate-alarm-shake"
          >
            <Hand size={20} className="mr-2" />
            起きました！
          </Button>
          <p className="mt-4 text-[13px] text-muted-foreground">
            タップするとアラームが止まります
          </p>
        </>
      )}

      {config.wakeStyle.id === "standard" && (
        <>
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
            className="relative w-full touch-none overflow-hidden rounded-2xl border border-moon bg-night-card px-6 py-5 text-lg font-extrabold text-moon active:scale-[0.99]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-moon/20 transition-[width]"
              style={{ width: `${holdProgress * 100}%` }}
            />
            <span className="relative flex items-center justify-center">
              <Hand size={20} className="mr-2" />
              長押しして停止
            </span>
          </button>
          <p className="mt-4 text-[13px] text-muted-foreground">
            約1.5秒間、指を離さず押してください
          </p>
        </>
      )}

      {config.wakeStyle.id === "strong" && (
        <>
          <div className="w-full rounded-2xl border border-moon/60 bg-night-card px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-sm font-extrabold text-moon">
              <span>右までスライドして停止</span>
              <ArrowRight size={18} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={slideValue}
              aria-label="右までスライドしてアラームを停止"
              onChange={(event) => handleSlide(Number(event.target.value))}
              onPointerUp={resetSlide}
              onPointerCancel={resetSlide}
              className="h-11 w-full cursor-pointer accent-moon"
            />
          </div>
          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            誤操作を防ぐため、最後まで動かすと停止します
          </p>
        </>
      )}
    </div>
  );
}
