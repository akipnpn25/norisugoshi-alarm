alter table public.alarm_history
  add column if not exists mode text not null default 'transit',
  add column if not exists duration_minutes integer,
  add column if not exists warning_minutes_before integer,
  add column if not exists started_at timestamptz;

comment on column public.alarm_history.mode is
  'transit, break, or nap';

comment on column public.alarm_history.duration_minutes is
  'Rest duration for break or nap mode';

comment on column public.alarm_history.warning_minutes_before is
  'Minutes before the alarm when the preview warning sounds';

comment on column public.alarm_history.started_at is
  'Start time for break or nap mode';
