-- Phase 3: water and daily habits.
-- Both of us can read everything; only the owner changes their own rows.

-- How big one tap of the water button is.
alter table public.profiles
  add column glass_ml int not null default 250 check (glass_ml between 50 and 1000);

-- One row per tap, so undo just deletes the latest.
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  ml int not null check (ml between 1 and 3000),
  created_at timestamptz not null default now()
);
create index water_logs_owner_date_idx on public.water_logs (owner_id, date, created_at);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (length(name) between 1 and 40),
  emoji text not null default '✅' check (length(emoji) between 1 and 16),
  -- check: done or not. number: a value against a daily target (steps, hours of sleep).
  kind text not null default 'check' check (kind in ('check', 'number')),
  target numeric(9, 1) check (target > 0),
  unit text check (length(unit) <= 12),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'check' or target is not null)
);
create index habits_owner_idx on public.habits (owner_id, position);

create trigger habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- A habit's value on a day: 1 for a ticked check habit, or the number.
create table public.habit_logs (
  habit_id uuid not null references public.habits on delete cascade,
  date date not null,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  value numeric(9, 1) not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (habit_id, date)
);
create index habit_logs_owner_date_idx on public.habit_logs (owner_id, date);

alter table public.water_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "members read water"
  on public.water_logs for select to authenticated using (public.is_member());
create policy "own water"
  on public.water_logs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

create policy "members read habits"
  on public.habits for select to authenticated using (public.is_member());
create policy "own habits"
  on public.habits for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

create policy "members read habit logs"
  on public.habit_logs for select to authenticated using (public.is_member());
create policy "own habit logs"
  on public.habit_logs for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.owner_id = auth.uid())
  );

-- A starter set for each of us (edit or delete any of them in the app).
insert into public.habits (owner_id, name, emoji, kind, target, unit, position)
select p.id, h.name, h.emoji, h.kind, h.target, h.unit, h.position
from public.profiles p
cross join (values
  ('Steps', '🚶', 'number', 10000, 'steps', 0),
  ('Creatine', '💊', 'check', null, null, 1),
  ('Sleep', '😴', 'number', 7, 'h', 2),
  ('Vitamins', '🍊', 'check', null, null, 3),
  ('No sugar', '🚫', 'check', null, null, 4)
) as h(name, emoji, kind, target, unit, position);
