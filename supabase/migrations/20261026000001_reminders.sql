-- Phase 5: per-person reminder settings, checked by the 15-minute tick.
-- Times are India time.
alter table public.profiles
  -- On days with a routine in the weekly plan, if the workout hasn't started.
  add column remind_workout boolean not null default true,
  add column remind_workout_at time not null default '18:00',
  -- Every few hours between two times, only when behind on water.
  add column remind_water boolean not null default false,
  add column water_from time not null default '09:00',
  add column water_to time not null default '21:00',
  add column water_every_h int not null default 2 check (water_every_h between 1 and 6),
  -- In the evening, if fewer than two meals are logged.
  add column remind_meals boolean not null default true,
  add column remind_meals_at time not null default '21:00',
  -- Once a week, if there's no weigh-in yet that day.
  add column remind_weigh_in boolean not null default true,
  add column weigh_in_weekday int not null default 1 check (weigh_in_weekday between 1 and 7),
  add column weigh_in_at time not null default '07:30',
  -- Pushes when your partner finishes a workout.
  add column notify_partner_workouts boolean not null default true,
  add constraint water_window check (water_from < water_to);
