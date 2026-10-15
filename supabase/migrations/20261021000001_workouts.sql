-- Phase 1: exercises, routines, the weekly plan, and logged workouts.
-- Both of us can read everything (to cheer each other on); only the owner changes it.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  -- null = built in (seeded below), otherwise someone's own exercise.
  owner_id uuid default auth.uid() references public.profiles on delete cascade,
  name text not null check (length(name) between 1 and 80),
  muscle text not null check (muscle in (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'quads', 'hamstrings', 'glutes', 'calves', 'core', 'cardio', 'full_body')),
  equipment text not null check (equipment in (
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other')),
  -- strength: weight × reps. cardio: time and distance. time: holds like a plank.
  kind text not null default 'strength' check (kind in ('strength', 'cardio', 'time')),
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "members read exercises"
  on public.exercises for select to authenticated using (public.is_member());
create policy "add own exercises"
  on public.exercises for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member());
create policy "change own exercises"
  on public.exercises for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own exercises"
  on public.exercises for delete to authenticated using (owner_id = auth.uid());

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (length(name) between 1 and 60),
  notes text check (length(notes) <= 500),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  position int not null,
  sets int not null default 3 check (sets between 1 and 20),
  reps_min int check (reps_min between 1 and 100),
  reps_max int check (reps_max between 1 and 100),
  rest_s int not null default 90 check (rest_s between 0 and 900),
  notes text check (length(notes) <= 200)
);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

-- Which routine on which weekday (1 = Monday … 7 = Sunday). No row = rest day.
create table public.routine_schedule (
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  routine_id uuid not null references public.routines on delete cascade,
  primary key (owner_id, weekday)
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  routine_id uuid references public.routines on delete set null,
  -- The routine's name when it was done (or "Workout"), so history survives edits.
  name text not null check (length(name) between 1 and 60),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text check (length(notes) <= 1000),
  feeling int check (feeling between 1 and 5),
  created_at timestamptz not null default now()
);
-- At most one workout in progress per person.
create unique index workouts_one_active_idx on public.workouts (owner_id) where ended_at is null;
create index workouts_owner_started_idx on public.workouts (owner_id, started_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  -- The exercise's place in the workout, and the set's number within it.
  position int not null,
  set_no int not null,
  reps int check (reps between 0 and 1000),
  weight_kg numeric(6, 2) check (weight_kg between 0 and 1000),
  duration_s int check (duration_s between 0 and 86400),
  distance_m int check (distance_m between 0 and 1000000),
  rest_s int not null default 90 check (rest_s between 0 and 900),
  is_warmup boolean not null default false,
  done boolean not null default false,
  done_at timestamptz
);
create index workout_sets_workout_idx on public.workout_sets (workout_id, position, set_no);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_schedule enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

-- Owned tables: read by both, written by the owner.
create policy "members read routines"
  on public.routines for select to authenticated using (public.is_member());
create policy "own routines"
  on public.routines for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

create policy "members read schedule"
  on public.routine_schedule for select to authenticated using (public.is_member());
create policy "own schedule"
  on public.routine_schedule for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid())
  );

create policy "members read workouts"
  on public.workouts for select to authenticated using (public.is_member());
create policy "own workouts"
  on public.workouts for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

-- Child rows follow their parent's owner.
create policy "members read routine exercises"
  on public.routine_exercises for select to authenticated using (public.is_member());
create policy "own routine exercises"
  on public.routine_exercises for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()));

create policy "members read sets"
  on public.workout_sets for select to authenticated using (public.is_member());
create policy "own sets"
  on public.workout_sets for all to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.owner_id = auth.uid()));

-- Built-in exercises.
insert into public.exercises (owner_id, name, muscle, equipment, kind) values
  -- Chest
  (null, 'Bench Press', 'chest', 'barbell', 'strength'),
  (null, 'Incline Bench Press', 'chest', 'barbell', 'strength'),
  (null, 'Dumbbell Bench Press', 'chest', 'dumbbell', 'strength'),
  (null, 'Incline Dumbbell Press', 'chest', 'dumbbell', 'strength'),
  (null, 'Dumbbell Fly', 'chest', 'dumbbell', 'strength'),
  (null, 'Chest Press Machine', 'chest', 'machine', 'strength'),
  (null, 'Pec Deck', 'chest', 'machine', 'strength'),
  (null, 'Cable Crossover', 'chest', 'cable', 'strength'),
  (null, 'Push-up', 'chest', 'bodyweight', 'strength'),
  (null, 'Chest Dip', 'chest', 'bodyweight', 'strength'),
  -- Back
  (null, 'Deadlift', 'back', 'barbell', 'strength'),
  (null, 'Barbell Row', 'back', 'barbell', 'strength'),
  (null, 'Dumbbell Row', 'back', 'dumbbell', 'strength'),
  (null, 'Pull-up', 'back', 'bodyweight', 'strength'),
  (null, 'Chin-up', 'back', 'bodyweight', 'strength'),
  (null, 'Lat Pulldown', 'back', 'cable', 'strength'),
  (null, 'Seated Cable Row', 'back', 'cable', 'strength'),
  (null, 'T-Bar Row', 'back', 'barbell', 'strength'),
  (null, 'Machine Row', 'back', 'machine', 'strength'),
  (null, 'Straight-Arm Pulldown', 'back', 'cable', 'strength'),
  (null, 'Back Extension', 'back', 'bodyweight', 'strength'),
  -- Shoulders
  (null, 'Overhead Press', 'shoulders', 'barbell', 'strength'),
  (null, 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'strength'),
  (null, 'Shoulder Press Machine', 'shoulders', 'machine', 'strength'),
  (null, 'Arnold Press', 'shoulders', 'dumbbell', 'strength'),
  (null, 'Lateral Raise', 'shoulders', 'dumbbell', 'strength'),
  (null, 'Cable Lateral Raise', 'shoulders', 'cable', 'strength'),
  (null, 'Front Raise', 'shoulders', 'dumbbell', 'strength'),
  (null, 'Rear Delt Fly', 'shoulders', 'dumbbell', 'strength'),
  (null, 'Face Pull', 'shoulders', 'cable', 'strength'),
  (null, 'Shrug', 'shoulders', 'dumbbell', 'strength'),
  -- Arms
  (null, 'Barbell Curl', 'biceps', 'barbell', 'strength'),
  (null, 'Dumbbell Curl', 'biceps', 'dumbbell', 'strength'),
  (null, 'Hammer Curl', 'biceps', 'dumbbell', 'strength'),
  (null, 'Preacher Curl', 'biceps', 'machine', 'strength'),
  (null, 'Cable Curl', 'biceps', 'cable', 'strength'),
  (null, 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'strength'),
  (null, 'Tricep Pushdown', 'triceps', 'cable', 'strength'),
  (null, 'Overhead Tricep Extension', 'triceps', 'cable', 'strength'),
  (null, 'Skull Crusher', 'triceps', 'barbell', 'strength'),
  (null, 'Close-Grip Bench Press', 'triceps', 'barbell', 'strength'),
  (null, 'Tricep Dip', 'triceps', 'bodyweight', 'strength'),
  (null, 'Dumbbell Kickback', 'triceps', 'dumbbell', 'strength'),
  (null, 'Wrist Curl', 'forearms', 'dumbbell', 'strength'),
  (null, 'Farmer''s Walk', 'forearms', 'dumbbell', 'strength'),
  -- Legs
  (null, 'Squat', 'quads', 'barbell', 'strength'),
  (null, 'Front Squat', 'quads', 'barbell', 'strength'),
  (null, 'Goblet Squat', 'quads', 'dumbbell', 'strength'),
  (null, 'Leg Press', 'quads', 'machine', 'strength'),
  (null, 'Hack Squat', 'quads', 'machine', 'strength'),
  (null, 'Leg Extension', 'quads', 'machine', 'strength'),
  (null, 'Bulgarian Split Squat', 'quads', 'dumbbell', 'strength'),
  (null, 'Walking Lunge', 'quads', 'dumbbell', 'strength'),
  (null, 'Step-up', 'quads', 'dumbbell', 'strength'),
  (null, 'Romanian Deadlift', 'hamstrings', 'barbell', 'strength'),
  (null, 'Dumbbell Romanian Deadlift', 'hamstrings', 'dumbbell', 'strength'),
  (null, 'Lying Leg Curl', 'hamstrings', 'machine', 'strength'),
  (null, 'Seated Leg Curl', 'hamstrings', 'machine', 'strength'),
  (null, 'Hip Thrust', 'glutes', 'barbell', 'strength'),
  (null, 'Glute Bridge', 'glutes', 'bodyweight', 'strength'),
  (null, 'Cable Kickback', 'glutes', 'cable', 'strength'),
  (null, 'Hip Abduction Machine', 'glutes', 'machine', 'strength'),
  (null, 'Hip Adduction Machine', 'glutes', 'machine', 'strength'),
  (null, 'Standing Calf Raise', 'calves', 'machine', 'strength'),
  (null, 'Seated Calf Raise', 'calves', 'machine', 'strength'),
  -- Core
  (null, 'Plank', 'core', 'bodyweight', 'time'),
  (null, 'Side Plank', 'core', 'bodyweight', 'time'),
  (null, 'Crunch', 'core', 'bodyweight', 'strength'),
  (null, 'Cable Crunch', 'core', 'cable', 'strength'),
  (null, 'Hanging Leg Raise', 'core', 'bodyweight', 'strength'),
  (null, 'Russian Twist', 'core', 'bodyweight', 'strength'),
  (null, 'Ab Wheel Rollout', 'core', 'other', 'strength'),
  (null, 'Dead Bug', 'core', 'bodyweight', 'strength'),
  -- Full body
  (null, 'Kettlebell Swing', 'full_body', 'kettlebell', 'strength'),
  (null, 'Burpee', 'full_body', 'bodyweight', 'strength'),
  (null, 'Clean and Press', 'full_body', 'barbell', 'strength'),
  -- Cardio
  (null, 'Treadmill', 'cardio', 'machine', 'cardio'),
  (null, 'Incline Walk', 'cardio', 'machine', 'cardio'),
  (null, 'Cycling', 'cardio', 'machine', 'cardio'),
  (null, 'Elliptical', 'cardio', 'machine', 'cardio'),
  (null, 'Rowing Machine', 'cardio', 'machine', 'cardio'),
  (null, 'Stair Climber', 'cardio', 'machine', 'cardio'),
  (null, 'Outdoor Run', 'cardio', 'other', 'cardio'),
  (null, 'Walk', 'cardio', 'other', 'cardio'),
  (null, 'Skipping Rope', 'cardio', 'other', 'time');
