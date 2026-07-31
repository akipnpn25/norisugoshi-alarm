"use client";

import { useState } from "react";
import {
  Headphones,
  Volume2,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { getAudioRoute } from "@/src/lib/headphone";
import {
  getStoredAlarmSound,
  previewSound,
} from "@/src/lib/sound";

interface HeadphoneCheckCardProps {
  checked: boolean;
  connected: boolean;
  routeName: string;
  onCheckStart?: () => void;
  onCheckEnd: (connected: boolean, name: string, error: string | null) => void;
}

export function HeadphoneCheckCard({
  checked,
  connected,
  routeName,
  onCheckStart,
  onCheckEnd,
}: HeadphoneCheckCardProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setError(null);
    onCheckStart?.();
    const route = await getAudioRoute();
    const routeError =
      route.type === "unknown" && !route.connected
        ? "出力先を自動判定できませんでした。試し音で実際の再生先をご確認ください。"
        : null;
    setError(routeError);
    onCheckEnd(route.connected, route.name, routeError);
    setChecking(false);
  };

  if (!checked) {
    return (
      <Button variant="secondary" onClick={check} disabled={checking} className="w-full">
        {checking ? "確認中..." : "音の出力先を確認（任意）"}
      </Button>
    );
  }

  if (connected) {
    return (
      <Card className="flex flex-col items-center border-success/40 bg-success/10">
        <Headphones className="text-success" size={40} />
        <p className="mt-2 text-lg font-extrabold text-success">イヤホン接続中</p>
        <p className="mt-1 text-center text-[13px] text-muted-foreground">
          イヤホンを通してアラームをお知らせします
        </p>
        {routeName && (
          <p className="mt-2 text-xs text-muted-foreground">接続機器: {routeName}</p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          実際にイヤホンから聞こえるか確認してください
        </p>

        <div className="mt-3.5 flex gap-2">
          <button
            onClick={() =>
              previewSound(getStoredAlarmSound())
            }
            className="flex items-center gap-1.5 rounded-xl bg-moon px-4 py-2 text-[13px] font-bold text-night-deep transition-opacity hover:opacity-90"
          >
            <Volume2 size={15} />
            試し音を再生
          </button>

          <button
            onClick={check}
            className="rounded-xl bg-night-surface px-4 py-2 text-[13px] font-bold text-foreground transition-colors hover:opacity-80"
          >
            再確認
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center border-moon/35 bg-moon/10">
      <Volume2 className="text-moon" size={40} />
      <p className="mt-2 text-base font-extrabold text-moon">
        本体スピーカーで利用できます
      </p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        {error ?? "イヤホンが未接続の場合は、本体スピーカーから再生されます"}
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        実際に聞こえるか、試し音で確認してください
      </p>
      <div className="mt-3.5 flex gap-2">
        <button
          onClick={() => previewSound(getStoredAlarmSound())}
          className="flex items-center gap-1.5 rounded-xl bg-moon px-4 py-2 text-[13px] font-bold text-night-deep transition-opacity hover:opacity-90"
        >
          <Volume2 size={15} />
          試し音を再生
        </button>
        <button
          onClick={check}
          className="rounded-xl bg-night-surface px-4 py-2 text-[13px] font-bold text-foreground transition-colors hover:opacity-80"
        >
          再確認
        </button>
      </div>
    </Card>
  );
}
