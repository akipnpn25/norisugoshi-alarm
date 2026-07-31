"use client";

import { Coffee, TrainFront } from "lucide-react";

import type { SetupMode } from "@/src/lib/types";

interface SetupModeSwitchProps {
  mode: SetupMode;
  onChange: (mode: SetupMode) => void;
}

const MODES: {
  id: SetupMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "transit",
    label: "電車",
    icon: <TrainFront size={18} />,
  },
  {
    id: "break",
    label: "休憩",
    icon: <Coffee size={18} />,
  },
];

export function SetupModeSwitch({
  mode,
  onChange,
}: SetupModeSwitchProps) {
  return (
    <div className="mx-auto max-w-md px-5 pt-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5">
        {MODES.map((item) => {
          const selected = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-pressed={selected}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold transition-all active:scale-[0.98] ${
                selected
                  ? "bg-moon text-night-deep"
                  : "text-muted-foreground hover:bg-night-surface"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
