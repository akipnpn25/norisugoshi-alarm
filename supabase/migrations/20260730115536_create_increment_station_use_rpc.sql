/*
# Create increment_station_use RPC

1. 目的
   - 駅が選択されたときに use_count と last_used_at を原子的に更新する。
   - 読み取り→書き込みの競合を避けるため、単一の SQL 関数で実行する。

2. 新規関数
   - `increment_station_use(station_id text)`
     - 指定IDの駅の use_count を +1 し、last_used_at を now() に更新する。
     - 該当行がない場合は何もしない。
     - SECURITY DEFINER は不要（anon が実行可能、RLS の UPDATE ポリシーで許可）。

3. セキュリティ
   - 既存の UPDATE ポリシー (anon_update_stations) が適用される。
*/

CREATE OR REPLACE FUNCTION increment_station_use(station_id text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE stations
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = station_id;
$$;
