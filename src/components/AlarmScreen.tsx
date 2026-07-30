"use client";

import { useEffect, useState } from "react";
import { Sun, MapPin, Hand } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import type { AlarmConfig } from "@/src/lib/types";
import { formatTimeWithDay } from "@/src/lib/time";

interface AlarmScreenProps {
  config: AlarmConfig;
  onStop: () => void;
}

export function AlarmScreen({ config, onStop }: AlarmScreenProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-7 py-8 animate-scale-in">
      {/* 月アイコン */}
      <div
        className={`mb-9 flex h-32 w-32 items-center justify-center rounded-full bg-moon/12 transition-transform ${
          pulse ? "scale-110" : "scale-100"
        }`}
      >
        <Sun className="text-moon animate-pulse-glow" size={64} />
      </div>

      <h2 className="text-3xl font-extrabold text-moon text-center">
        おはよう！
      </h2>
      <p className="mt-3.5 text-center text-2xl font-extrabold text-foreground">
        まもなく{config.station.name}です
      </p>
      <p className="mt-2.5 text-base text-muted-foreground">
        {formatTimeWithDay(config.arrivalTime)} 到着予定
      </p>

      <div className="h-16" />

      <Button
        onClick={onStop}
        size="lg"
        className="w-full animate-alarm-shake"
      >
        <Hand size={20} className="mr-2" />
        起きました！
      </Button>
      <p className="mt-4 text-[13px] text-muted-foreground">
        ボタンを押すとアラームが止まります
      </p>
    </div>
  );
}
