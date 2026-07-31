/*
# Create alarm_history table (per-user anonymous auth)

- 匿名サインインした利用者ごとに履歴を分離する。
- user_id は auth.uid() を既定値として保存する。
- RLS により、自分の履歴だけを読み書き・削除できる。
*/

CREATE TABLE IF NOT EXISTS public.alarm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    DEFAULT auth.uid()
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  station_id text NOT NULL,
  station_name text NOT NULL,
  arrival_time timestamptz NOT NULL,
  alarm_time timestamptz NOT NULL,
  lead_time_minutes integer NOT NULL,
  demo_mode text NOT NULL DEFAULT 'normal',
  earphone_connected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'set',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alarm_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alarm_history"
ON public.alarm_history;
CREATE POLICY "select_own_alarm_history"
ON public.alarm_history
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_alarm_history"
ON public.alarm_history;
CREATE POLICY "insert_own_alarm_history"
ON public.alarm_history
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_alarm_history"
ON public.alarm_history;
CREATE POLICY "update_own_alarm_history"
ON public.alarm_history
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_alarm_history"
ON public.alarm_history;
CREATE POLICY "delete_own_alarm_history"
ON public.alarm_history
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_alarm_history_user_created_at
ON public.alarm_history (user_id, created_at DESC);

REVOKE ALL PRIVILEGES
ON TABLE public.alarm_history
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.alarm_history
TO authenticated;
