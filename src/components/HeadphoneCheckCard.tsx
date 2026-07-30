"use client";

import { useState } from "react";
import {
  Headphones,
  AlertTriangle,
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
        ? "イヤホン状態を取得できませんでした。ブラウザのオーディオ設定をご確認ください。"
        : null;
    setError(routeError);
    onCheckEnd(route.connected, route.name, routeError);
    setChecking(false);
  };

  if (!checked) {
    return (
      <Button variant="secondary" onClick={check} disabled={checking} className="w-full">
        {checking ? "確認中..." : "イヤホン接続を確認"}
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
    <Card className="flex flex-col items-center border-destructive/35 bg-destructive/10">
      <AlertTriangle className="text-destructive" size={40} />
      <p className="mt-2 text-base font-extrabold text-destructive">
        イヤホンが接続されていません
      </p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        {error ?? "イヤホンを接続してください"}
      </p>
      <button
        onClick={check}
        className="mt-3.5 rounded-xl bg-night-surface px-4 py-2 text-[13px] font-bold text-foreground transition-colors hover:opacity-80"
      >
        再確認
      </button>
    </Card>
  );
}
