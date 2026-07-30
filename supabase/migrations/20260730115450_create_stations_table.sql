/*
# Create stations table (single-tenant, no auth)

1. 目的
   - ユーザーが選択した目的地（駅）を永続化し、利用履歴順に並び替えるためのテーブル。
   - プリセット駅とユーザー追加駅の両方を管理する。
   - 「最近使った順」で表示するため、last_used_at と use_count を保持する。

2. 新規テーブル
   - `stations`
     - `id` (text, primary key) — 駅の一意ID（例: shinjuku / custom-<uuid>）
     - `name` (text, not null) — 表示用駅名（例: 新宿駅）
     - `kana` (text, not null default '') — 読み仮名
     - `is_custom` (boolean, not null default false) — ユーザー追加駅かどうか
     - `use_count` (integer, not null default 0) — 選択された回数
     - `last_used_at` (timestamptz, nullable) — 最後に選択された日時
     - `created_at` (timestamptz, default now()) — 作成日時

3. セキュリティ
   - RLSを有効化。
   - サインイン画面がないアプリのため、anon + authenticated の両ロールに
     全CRUDを許可する（データは意図的に共有される単一テナント構成）。

4. 初期データ
   - プリセット駅を 18 件挿入（ON CONFLICT で既存時はスキップ）。
   - 初期状態では use_count=0, last_used_at=NULL とし、
     アプリ側で created_at 順をフォールバック表示順とする。
*/

CREATE TABLE IF NOT EXISTS stations (
  id text PRIMARY KEY,
  name text NOT NULL,
  kana text NOT NULL DEFAULT '',
  is_custom boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stations" ON stations;
CREATE POLICY "anon_select_stations" ON stations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_stations" ON stations;
CREATE POLICY "anon_insert_stations" ON stations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_stations" ON stations;
CREATE POLICY "anon_update_stations" ON stations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_stations" ON stations;
CREATE POLICY "anon_delete_stations" ON stations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_stations_last_used_at
  ON stations (last_used_at DESC NULLS LAST);

-- プリセット駅の初期データ
INSERT INTO stations (id, name, kana, is_custom) VALUES
  ('shinjuku', '新宿駅', 'しんじゅくえき', false),
  ('shibuya', '渋谷駅', 'しぶやえき', false),
  ('tokyo', '東京駅', 'とうきょうえき', false),
  ('ikebukuro', '池袋駅', 'いけぶくろえき', false),
  ('shinagawa', '品川駅', 'しながわえき', false),
  ('shinbashi', '新橋駅', 'しんばしえき', false),
  ('yurakucho', '有楽町駅', 'ゆうらくちょうえき', false),
  ('akihabara', '秋葉原駅', 'あきはばらえき', false),
  ('ueno', '上野駅', 'うえのえき', false),
  ('kanda', '神田駅', 'かんだえき', false),
  ('tokyo-stn', '東京タワー前', 'とうきょうたわーまえ', false),
  ('hamamatsucho', '浜松町駅', 'はままつちょうえき', false),
  ('tamachi', '田町駅', 'たまちえき', false),
  ('ebisu', '恵比寿駅', 'えびすえき', false),
  ('meguro', '目黒駅', 'めぐろえき', false),
  ('gotanda', '五反田駅', 'ごたんだえき', false),
  ('osaki', '大崎駅', 'おおさきえき', false),
  ('kamata', '蒲田駅', 'かまたえき', false)
ON CONFLICT (id) DO NOTHING;
