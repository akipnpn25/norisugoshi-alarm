"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Pencil, Check, Clock3 } from "lucide-react";

interface TimeWheelPickerProps {
  hour: number;
  minute: number;
  onComplete: (hour: number, minute: number) => void;
  label?: string;
  editorTitle?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2);

function range(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function WheelColumn({
  values,
  selected,
  onChange,
  format,
}: {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | null>(null);
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;

    const frame = window.requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;

      // 選択中の値を中央へ即座に合わせる。
      // smoothを使わず、スクロールイベントとの競合を防ぐ。
      el.scrollTop = selected * ITEM_HEIGHT;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        window.clearTimeout(scrollTimer.current);
      }
    };
  }, []);

  const selectValue = (value: number) => {
    const index = values.indexOf(value);
    const el = listRef.current;

    if (el && index >= 0) {
      el.scrollTop = index * ITEM_HEIGHT;
    }

    selectedRef.current = value;
    onChange(value);
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;

    if (scrollTimer.current) {
      window.clearTimeout(scrollTimer.current);
    }

    scrollTimer.current = window.setTimeout(() => {
      const index = Math.round(
        el.scrollTop / ITEM_HEIGHT
      );
      const clampedIndex = Math.max(
        0,
        Math.min(values.length - 1, index)
      );
      const targetTop = clampedIndex * ITEM_HEIGHT;
      const nextValue = values[clampedIndex];

      // 端数だけを補正し、追加の滑らかなアニメーションは行わない。
      if (Math.abs(el.scrollTop - targetTop) > 0.5) {
        el.scrollTop = targetTop;
      }

      if (nextValue !== selectedRef.current) {
        selectedRef.current = nextValue;
        onChange(nextValue);
      }
    }, 120);
  };

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ height: PICKER_HEIGHT }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[36%] bg-gradient-to-b from-night-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[36%] bg-gradient-to-t from-night-card to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-3 z-0 rounded-2xl border-y border-moon/30 bg-moon/10"
        style={{
          top: PAD_COUNT * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-hide"
      >
        <div
          aria-hidden="true"
          style={{ height: PAD_COUNT * ITEM_HEIGHT }}
        />

        {values.map((value) => {
          const isSelected = value === selected;

          return (
            <div
              key={value}
              className="snap-center"
              style={{ height: ITEM_HEIGHT }}
            >
              <button
                type="button"
                onClick={() => selectValue(value)}
                className={`flex h-full w-full items-center justify-center text-3xl font-extrabold tabular-nums transition-colors ${
                  isSelected
                    ? "scale-105 text-moon"
                    : "text-muted-foreground/60"
                }`}
              >
                {format(value)}
              </button>
            </div>
          );
        })}

        <div
          aria-hidden="true"
          style={{ height: PAD_COUNT * ITEM_HEIGHT }}
        />
      </div>
    </div>
  );
}

export function TimeWheelPicker({
  hour,
  minute,
  onComplete,
  label = "到着予定時刻",
  editorTitle = "到着時刻を設定",
}: TimeWheelPickerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  const openEditor = () => {
    setDraftHour(hour);
    setDraftMinute(minute);
    setIsEditing(true);
  };

  const commit = () => {
    onComplete(draftHour, draftMinute);
    setIsEditing(false);
  };

  const cancel = () => {
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={openEditor}
        className="group flex w-full items-center justify-between rounded-3xl border border-border bg-card px-6 py-5 transition-all hover:bg-night-surface active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <Clock className="text-moon-dim" size={22} />
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-4xl font-extrabold tabular-nums text-moon">
              {pad2(hour)}<span className="text-moon-dim">:</span>{pad2(minute)}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-night-surface px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition-colors group-hover:text-foreground">
          <Pencil size={13} />
          変更
        </span>
      </button>
    );
  }

  return (
    <div className="animate-scale-in rounded-3xl border border-moon/30 bg-night-card p-4">
      {/* ヘッダー */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          {editorTitle}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const now = new Date();
              setDraftHour(now.getHours());
              setDraftMinute(now.getMinutes());
            }}
            className="flex items-center gap-1.5 rounded-full bg-night-surface px-3 py-1.5 text-[13px] font-bold text-moon transition-colors hover:bg-moon/15"
          >
            <Clock3 size={13} />
            現在時刻
          </button>
          <button
            onClick={cancel}
            className="rounded-full px-3 py-1 text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            キャンセル
          </button>
        </div>
      </div>

      {/* ホイール */}
      <div className="flex items-stretch gap-1 rounded-2xl bg-night-deep/50 p-2">
        <WheelColumn
          values={range(24)}
          selected={draftHour}
          onChange={setDraftHour}
          format={pad2}
        />
        <div className="flex items-center justify-center px-0.5">
          <span className="text-3xl font-extrabold text-moon-dim">:</span>
        </div>
        <WheelColumn
          values={range(60)}
          selected={draftMinute}
          onChange={setDraftMinute}
          format={pad2}
        />
      </div>

      {/* 現在の選択プレビュー */}
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">設定後:</span>
        <span className="text-lg font-extrabold tabular-nums text-moon">
          {pad2(draftHour)}:{pad2(draftMinute)}
        </span>
      </div>

      {/* 完了ボタン */}
      <button
        onClick={commit}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-moon py-3.5 text-base font-extrabold text-night-deep transition-all active:scale-[0.98]"
      >
        <Check size={20} strokeWidth={3} />
        完了
      </button>
    </div>
  );
}
