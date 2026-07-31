"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  Settings,
  Undo2,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { WAKE_STYLES } from "@/src/lib/data";
import type {
  ImmediateRecommendation,
  RecommendationMode,
} from "@/src/lib/recommendation";
import type {
  SetupMode,
  WakeStyleId,
} from "@/src/lib/types";

interface ImmediateRecommendationCardProps {
  mode: SetupMode;
  recommendation: ImmediateRecommendation | null;
  pendingWakeStyleId?: WakeStyleId;
  onTryRecommendation: () => void;
  onKeepCurrent: () => void;
  onCancelPending: () => void;
  onReviewSettings: () => void;
}

function wakeStyleLabel(
  id: WakeStyleId
): string {
  return (
    WAKE_STYLES.find(
      (style) => style.id === id
    )?.label ?? id
  );
}

function modeLabel(
  mode: RecommendationMode
): string {
  return mode === "transit"
    ? "電車"
    : "休憩";
}

export function ImmediateRecommendationCard({
  mode,
  recommendation,
  pendingWakeStyleId,
  onTryRecommendation,
  onKeepCurrent,
  onCancelPending,
  onReviewSettings,
}: ImmediateRecommendationCardProps) {
  if (pendingWakeStyleId) {
    return (
      <Card className="mt-4 border-success/40 bg-success/10">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={22}
            className="mt-0.5 shrink-0 text-success"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-foreground">
              次回だけ「
              {wakeStyleLabel(
                pendingWakeStyleId
              )}
              」を使います
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              普段の起こし方は変更されません。
              次の{modeLabel(mode)}
              アラームで一度だけ試します。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancelPending}
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
        >
          <Undo2 size={14} />
          取り消す
        </button>
      </Card>
    );
  }

  if (
    !recommendation ||
    recommendation.mode !== mode
  ) {
    return null;
  }

  const isRepeated =
    recommendation.consecutiveLateCount >= 2;
  const recommendedWakeStyleId =
    recommendation.recommendedWakeStyleId;

  return (
    <Card
      className={`mt-4 ${
        isRepeated
          ? "border-destructive/50 bg-destructive/10"
          : "border-moon/40 bg-moon/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <ArrowUpCircle
          size={23}
          className={`mt-0.5 shrink-0 ${
            isRepeated
              ? "text-destructive"
              : "text-moon"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-foreground">
            {isRepeated
              ? `${recommendation.consecutiveLateCount}回連続で時間内に反応できませんでした`
              : "今回は時間内に反応できませんでした"}
          </p>

          {recommendedWakeStyleId ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              次回は「
              {wakeStyleLabel(
                recommendedWakeStyleId
              )}
              」を試してみませんか？
            </p>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              「絶対に起きたい」でも間に合わなかったため、
              アラーム音・出力先・起こす時刻を
              見直してみましょう。
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {recommendedWakeStyleId ? (
          <Button
            type="button"
            onClick={onTryRecommendation}
            size="sm"
          >
            次回使ってみる
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onReviewSettings}
            size="sm"
          >
            <Settings
              size={15}
              className="mr-1.5"
            />
            設定を見直す
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onKeepCurrent}
        >
          このまま
        </Button>
      </div>
    </Card>
  );
}
