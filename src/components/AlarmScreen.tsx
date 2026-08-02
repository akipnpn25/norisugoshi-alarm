"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Coffee,
  Hand,
  Sun,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import type { AlarmConfig } from "@/src/lib/types";
import { formatTimeWithDay } from "@/src/lib/time";

interface AlarmScreenProps {
  config: AlarmConfig;
  onFirstInteraction: () => void;
  onStop: () => void;
}

const SLIDE_THUMB_SIZE = 56;
const SLIDE_TRACK_PADDING = 8;
const SLIDE_COMPLETE_RATIO = 0.86;

export function AlarmScreen({
  config,
  onFirstInteraction,
  onStop,
}: AlarmScreenProps) {
  const [pulse, setPulse] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [slideMaxOffset, setSlideMaxOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const slideTrackRef = useRef<HTMLDivElement | null>(null);
  const slideOffsetRef = useRef(0);
  const slidePointerIdRef = useRef<number | null>(null);
  const slideStartXRef = useRef(0);
  const slideStartOffsetRef = useRef(0);
  const stoppingRef = useRef(false);
  const interactionRecordedRef = useRef(
    Boolean(config.firstInteractionAt)
  );
  const isBreak = config.mode === "break";
  const destinationName = config.station.name.trim();
  const activeWakeStyle =
    config.activeWakeStyle ?? config.wakeStyle;
  const alarmStage = config.alarmStage ?? 1;

  useEffect(() => {
    const id = setInterval(
      () => setPulse((current) => !current),
      500
    );

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const track = slideTrackRef.current;

    if (!track) return;

    const updateMaxOffset = () => {
      const nextMaxOffset = Math.max(
        0,
        track.clientWidth -
          SLIDE_THUMB_SIZE -
          SLIDE_TRACK_PADDING * 2
      );

      setSlideMaxOffset(nextMaxOffset);
      slideOffsetRef.current = Math.min(
        slideOffsetRef.current,
        nextMaxOffset
      );
      setSlideOffset(slideOffsetRef.current);
    };

    updateMaxOffset();

    const observer = new ResizeObserver(updateMaxOffset);
    observer.observe(track);

    return () => observer.disconnect();
  }, [activeWakeStyle.id]);

  const recordFirstInteraction = () => {
    if (interactionRecordedRef.current) return;

    interactionRecordedRef.current = true;
    onFirstInteraction();
  };

  const finishStop = () => {
    if (stoppingRef.current) return;

    recordFirstInteraction();
    stoppingRef.current = true;
    onStop();
  };

  const updateSlideOffset = (value: number) => {
    const nextValue = Math.min(
      slideMaxOffset,
      Math.max(0, value)
    );

    slideOffsetRef.current = nextValue;
    setSlideOffset(nextValue);
  };

  const startSlide = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (stoppingRef.current) return;

    recordFirstInteraction();
    slidePointerIdRef.current = event.pointerId;
    slideStartXRef.current = event.clientX;
    slideStartOffsetRef.current =
      slideOffsetRef.current;
    setIsSliding(true);
    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const moveSlide = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (
      slidePointerIdRef.current !== event.pointerId ||
      stoppingRef.current
    ) {
      return;
    }

    const nextOffset =
      slideStartOffsetRef.current +
      event.clientX -
      slideStartXRef.current;

    updateSlideOffset(nextOffset);

    if (
      slideMaxOffset > 0 &&
      nextOffset >=
        slideMaxOffset * SLIDE_COMPLETE_RATIO
    ) {
      updateSlideOffset(slideMaxOffset);
      finishStop();
    }
  };

  const finishSlide = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (
      slidePointerIdRef.current !== event.pointerId ||
      stoppingRef.current
    ) {
      return;
    }

    slidePointerIdRef.current = null;
    setIsSliding(false);

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    updateSlideOffset(0);
  };

  const handleSlideKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      recordFirstInteraction();
      finishStop();
      return;
    }

    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft"
    ) {
      return;
    }

    event.preventDefault();
    recordFirstInteraction();

    const direction =
      event.key === "ArrowRight" ? 1 : -1;
    const nextOffset =
      slideOffsetRef.current +
      direction * Math.max(16, slideMaxOffset * 0.12);

    updateSlideOffset(nextOffset);

    if (
      nextOffset >=
      slideMaxOffset * SLIDE_COMPLETE_RATIO
    ) {
      updateSlideOffset(slideMaxOffset);
      finishStop();
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-7 py-8 animate-scale-in">
      <div
        className={`mb-7 flex h-32 w-32 items-center justify-center rounded-full bg-moon/12 transition-transform ${
          pulse ? "scale-110" : "scale-100"
        }`}
      >
        {isBreak ? (
          <Coffee
            className="text-moon animate-pulse-glow"
            size={64}
          />
        ) : (
          <Sun
            className="text-moon animate-pulse-glow"
            size={64}
          />
        )}
      </div>

      <p className="mb-2 rounded-full bg-moon/15 px-3 py-1.5 text-xs font-extrabold text-moon">
        {activeWakeStyle.label}
      </p>
      {!isBreak && (
        <p className="mb-3 text-xs font-bold text-muted-foreground">
          {alarmStage === 1
            ? "1段階目"
            : alarmStage === 2
              ? "2段階目・強化中"
              : "最終段階・再通知"}
        </p>
      )}
      <h2 className="text-center text-3xl font-extrabold text-moon">
        {isBreak ? "休憩終了です" : "おはよう！"}
      </h2>
      <p className="mt-3.5 text-center text-2xl font-extrabold text-foreground">
        {isBreak
          ? "休憩時間が終わりました"
          : destinationName
            ? `まもなく${destinationName}です`
            : "起きる時間です"}
      </p>
      <p className="mt-2.5 text-base text-muted-foreground">
        {formatTimeWithDay(
          isBreak
            ? config.alarmTime
            : config.arrivalTime
        )}
        {isBreak ? " 終了予定" : " 到着予定"}
      </p>

      <div className="h-12" />

      {activeWakeStyle.id === "gentle" && (
        <>
          <Button
            onPointerDown={recordFirstInteraction}
            onClick={finishStop}
            size="lg"
            className="w-full animate-alarm-shake"
          >
            <Hand size={20} className="mr-2" />
            {isBreak
              ? "休憩を終える"
              : "起きました！"}
          </Button>
          <p className="mt-4 text-[13px] text-muted-foreground">
            タップするとアラームが止まります
          </p>
        </>
      )}

      {activeWakeStyle.id === "standard" && (
        <>
          <Button
            onPointerDown={recordFirstInteraction}
            onClick={finishStop}
            size="lg"
            className="w-full animate-alarm-shake"
          >
            <Hand size={20} className="mr-2" />
            {isBreak
              ? "休憩を終える"
              : "アラームを止める"}
          </Button>
          <p className="mt-4 text-[13px] text-muted-foreground">
            タップするとアラームが止まります
          </p>
        </>
      )}

      {activeWakeStyle.id === "strong" && (
        <>
          <div
            ref={slideTrackRef}
            className="relative h-[72px] w-full select-none overflow-hidden rounded-full border border-moon/55 bg-night-card/95 shadow-inner touch-none"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 pl-16 pr-5 text-sm font-extrabold text-moon transition-opacity"
              style={{
                opacity:
                  slideMaxOffset > 0
                    ? Math.max(
                        0.18,
                        1 -
                          slideOffset /
                            slideMaxOffset
                      )
                    : 1,
              }}
            >
              <span>右へスライドして停止</span>
              <ArrowRight size={18} />
            </div>

            <button
              type="button"
              role="slider"
              aria-label="右へスライドしてアラームを停止"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                slideMaxOffset > 0
                  ? Math.round(
                      (slideOffset /
                        slideMaxOffset) *
                        100
                    )
                  : 0
              }
              onPointerDown={startSlide}
              onPointerMove={moveSlide}
              onPointerUp={finishSlide}
              onPointerCancel={finishSlide}
              onKeyDown={handleSlideKeyDown}
              className="absolute left-2 top-2 flex h-14 w-14 touch-none items-center justify-center rounded-full bg-moon text-night-deep shadow-lg outline-none ring-offset-2 ring-offset-night-card transition-shadow focus-visible:ring-2 focus-visible:ring-moon active:shadow-md"
              style={{
                transform: `translateX(${slideOffset}px)`,
                transition: isSliding
                  ? "none"
                  : "transform 220ms ease-out",
              }}
            >
              <ArrowRight size={27} strokeWidth={2.8} />
            </button>
          </div>

          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            丸いボタンをつかんで、右端近くまで動かしてください
          </p>
        </>
      )}
    </div>
  );
}
