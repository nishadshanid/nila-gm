-- Phase 0: the two of us, our phones, and the 15-minute tick.

-- Sign-ups are disabled, so every authenticated user is one of the two of us.
-- All later RLS policies go through this function, so it's the one place to tighten.
create or replace function public.is_member()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated'
$$;

-- Shared updated_at trigger, reused by later tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null,
  color text not null default '#16a34a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  push_notifications boolean not null default true,
  -- Body and goals, filled in by the diet calculator (phase 2).
  sex text check (sex in ('male', 'female')),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  birth_year int check (birth_year between 1930 and 2020),
  goal text not null default 'maintain' check (goal in ('cut', 'maintain', 'bulk')),
  activity text not null default 'moderate'
    check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  -- Daily targets.
  target_kcal int check (target_kcal between 800 and 6000),
  target_protein_g int check (target_protein_g between 0 and 500),
  target_carbs_g int check (target_carbs_g between 0 and 1000),
  target_fat_g int check (target_fat_g between 0 and 400),
  target_water_ml int not null default 3000 check (target_water_ml between 500 and 10000),
  target_steps int not null default 8000 check (target_steps between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Both of us can see each other's progress; only you change yours.
create policy "members can read profiles"
  on public.profiles for select to authenticated
  using (public.is_member());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user is added in the Supabase dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration ran.
insert into public.profiles (id, name, email)
select id, coalesce(raw_user_meta_data ->> 'name', split_part(email, '@', 1)), email
from auth.users
on conflict (id) do nothing;

-- One row per device that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member());

-- One row per notification we've decided to send, so a repeated tick never sends twice.
-- Server-only: RLS on with no policies.
create table public.notification_log (
  id bigint generated always as identity primary key,
  kind text not null,
  key text not null,
  user_id uuid not null references public.profiles on delete cascade,
  sent_at timestamptz not null default now(),
  unique (kind, key, user_id)
);

alter table public.notification_log enable row level security;

-- Every 15 minutes, call the app's /api/cron/tick. Inactive until both secrets exist:
--   select vault.create_secret('https://<your-app>.vercel.app', 'nila_gym_app_url');
--   select vault.create_secret('<same value as CRON_SECRET>', 'nila_gym_cron_secret');
-- The regular calls also keep the free Supabase project from pausing.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'nila-gym-tick';

select cron.schedule('nila-gym-tick', '*/15 * * * *', $job$
  select net.http_post(
    url := s.url || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.secret,
      'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  from (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'nila_gym_app_url') as url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'nila_gym_cron_secret') as secret
  ) s
  where s.url is not null and s.secret is not null
$job$);
