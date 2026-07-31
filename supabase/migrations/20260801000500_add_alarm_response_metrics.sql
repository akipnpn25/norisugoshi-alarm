alter table public.alarm_history
  add column if not exists alarm_fired_at timestamptz,
  add column if not exists first_interaction_at timestamptz,
  add column if not exists stopped_at timestamptz,
  add column if not exists reaction_ms integer,
  add column if not exists stop_ms integer;

comment on column public.alarm_history.alarm_fired_at is
  'Actual time when the alarm began sounding';

comment on column public.alarm_history.first_interaction_at is
  'First pointer or keyboard interaction after the alarm began';

comment on column public.alarm_history.stopped_at is
  'Time when the stop action was completed';

comment on column public.alarm_history.reaction_ms is
  'Milliseconds from alarm start to first interaction';

comment on column public.alarm_history.stop_ms is
  'Milliseconds from alarm start to completed stop action';
