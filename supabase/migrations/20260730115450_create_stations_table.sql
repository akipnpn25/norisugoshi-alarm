/*
# Create stations table (per-user anonymous auth)

- 駅一覧、追加駅、利用回数を利用者ごとに分離する。
- 同じ駅IDを複数利用者が持てるよう、主キーは (user_id, id) とする。
- 初期駅は ensure_default_stations() で利用者ごとに作成する。
*/

CREATE TABLE IF NOT EXISTS public.stations (
  user_id uuid NOT NULL
    DEFAULT auth.uid()
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  kana text NOT NULL DEFAULT '',
  is_custom boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stations"
ON public.stations;
CREATE POLICY "select_own_stations"
ON public.stations
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_stations"
ON public.stations;
CREATE POLICY "insert_own_stations"
ON public.stations
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_stations"
ON public.stations;
CREATE POLICY "update_own_stations"
ON public.stations
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_stations"
ON public.stations;
CREATE POLICY "delete_own_stations"
ON public.stations
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_stations_user_last_used
ON public.stations (user_id, last_used_at DESC NULLS LAST);

REVOKE ALL PRIVILEGES
ON TABLE public.stations
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stations
TO authenticated;
