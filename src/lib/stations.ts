import { supabase } from "./supabase";
import { ensureAnonymousSession } from "./auth";
import type { Station } from "./types";

export interface StationRow extends Station {
  isCustom: boolean;
  useCount: number;
  lastUsedAt: string | null;
}

function rowToStation(row: {
  id: string;
  name: string;
  kana: string;
  is_custom: boolean;
  use_count: number;
  last_used_at: string | null;
}): StationRow {
  return {
    id: row.id,
    name: row.name,
    kana: row.kana,
    isCustom: row.is_custom,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  };
}

/**
 * 履歴順（最近使った順）で駅一覧を取得する。
 * last_used_at が NULL のものは最後尾、それ以外は新しい順。
 * 同一タイムスタンプの場合はプリセット → 作成順で安定させる。
 */
export async function fetchStations(): Promise<StationRow[]> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return [];
  }

  const { error: defaultsError } = await supabase.rpc("ensure_default_stations");
  if (defaultsError) {
    console.warn("初期駅の作成に失敗:", defaultsError);
  }

  const { data, error } = await supabase
    .from("stations")
    .select("id, name, kana, is_custom, use_count, last_used_at")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("is_custom", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("駅の取得に失敗:", error);
    return [];
  }
  return (data ?? []).map(rowToStation);
}

/**
 * 新しい駅を追加する（ユーザー入力）。
 * 同名駅が既存の場合はそれを再利用して use_count を更新する。
 */
export async function addStation(name: string, kana = ""): Promise<StationRow | null> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return null;
  }

  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: existErr } = await supabase
    .from("stations")
    .select("id, name, kana, is_custom, use_count, last_used_at")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existErr) {
    console.warn("駅の重複確認に失敗:", existErr);
  }

  if (existing) {
    const row = rowToStation(existing);
    await recordStationUse(row.id);
    return { ...row, useCount: row.useCount + 1, lastUsedAt: new Date().toISOString() };
  }

  const id = `custom-${Date.now()}`;
  const { data, error } = await supabase
    .from("stations")
    .insert({
      id,
      name: trimmed,
      kana,
      is_custom: true,
      use_count: 1,
      last_used_at: new Date().toISOString(),
    })
    .select("id, name, kana, is_custom, use_count, last_used_at")
    .maybeSingle();

  if (error) {
    console.warn("駅の追加に失敗:", error);
    return null;
  }
  return data ? rowToStation(data) : null;
}

/**
 * 駅を選択したときに利用回数と最終利用日時を原子的に更新する。
 */
export async function recordStationUse(stationId: string): Promise<void> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return;
  }

  const { error } = await supabase.rpc("increment_station_use", {
    station_id: stationId,
  });
  if (error) {
    console.warn("駅の利用記録更新に失敗:", error);
  }
}

/**
 * ユーザー追加駅を削除する。
 */
export async function deleteStation(stationId: string): Promise<void> {
  try {
    await ensureAnonymousSession();
  } catch (error) {
    console.warn("匿名利用者の準備に失敗:", error);
    return;
  }

  const { error } = await supabase.from("stations").delete().eq("id", stationId);
  if (error) {
    console.warn("駅の削除に失敗:", error);
  }
}
