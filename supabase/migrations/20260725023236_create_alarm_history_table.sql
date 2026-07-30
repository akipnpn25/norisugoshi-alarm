/*
# Create alarm_history table (single-tenant, no auth)

1. Purpose
   - アラームの利用履歴を保存するテーブル。
   - どの駅・到着予定時刻・何分前に起こしたか・デモモードかを記録し、
     今後の利用統計や改善の参考にする。

2. New Tables
   - `alarm_history`
     - `id` (uuid, primary key) — 履歴の一意ID
     - `station_id` (text, not null) — 選択された目的地のID（例: shinjuku）
     - `station_name` (text, not null) — 駅名（表示用、例: 新宿駅）
     - `arrival_time` (timestamptz, not null) — 到着予定時刻
     - `alarm_time` (timestamptz, not null) — アラーム鳴動予定時刻
     - `lead_time_minutes` (integer, not null) — 何分前に起こすか（3/5/10）
     - `demo_mode` (text, not null, default 'normal') — デモモードID
     - `earphone_connected` (boolean, not null, default false) — イヤホン接続有無
     - `status` (text, not null, default 'set') — アラーム状態（set/fired/cancelled）
     - `created_at` (timestamptz, default now()) — 履歴作成日時

3. Security
   - RLSを有効化。
   - サインイン画面がないアプリのため、anon + authenticated の両ロールに
     全CRUDを許可する（データは意図的に共有・公開される単一テナント構成）。
*/

CREATE TABLE IF NOT EXISTS alarm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  station_name text NOT NULL,
  arrival_time timestamptz NOT NULL,
  alarm_time timestamptz NOT NULL,
  lead_time_minutes integer NOT NULL,
  demo_mode text NOT NULL DEFAULT 'normal',
  earphone_connected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'set',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alarm_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alarm_history" ON alarm_history;
CREATE POLICY "anon_select_alarm_history" ON alarm_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alarm_history" ON alarm_history;
CREATE POLICY "anon_insert_alarm_history" ON alarm_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alarm_history" ON alarm_history;
CREATE POLICY "anon_update_alarm_history" ON alarm_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alarm_history" ON alarm_history;
CREATE POLICY "anon_delete_alarm_history" ON alarm_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_alarm_history_created_at
  ON alarm_history (created_at DESC);
