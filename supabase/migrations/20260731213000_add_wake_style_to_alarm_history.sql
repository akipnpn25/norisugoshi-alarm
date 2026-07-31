alter table public.alarm_history
  add column if not exists wake_style text not null default 'standard';

comment on column public.alarm_history.wake_style is
  'gentle, standard, or strong';
