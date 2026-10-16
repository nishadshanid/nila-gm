-- Flexible programmes (N workouts a week, in order) and exercise swaps by body focus.
-- Also loads Nishad's and his wife's programmes, with each Day lined up on the same area.

-- 1. A weekly goal instead of fixed weekdays. Null = use the weekday plan as before.
alter table public.profiles
  add column weekly_goal int check (weekly_goal between 1 and 7);

-- 2. What each exercise works, and its movement, so the app can suggest a swap when a
--    machine is missing or taken.
alter table public.exercises
  add column focus text check (length(focus) <= 40),
  add column pattern text check (length(pattern) <= 30);

insert into public.exercises (owner_id, name, muscle, equipment, kind) values
  (null, 'Smith Machine Squat', 'quads', 'machine', 'strength'),
  (null, 'Smith Machine Bench Press', 'chest', 'machine', 'strength'),
  (null, 'Incline Chest Press Machine', 'chest', 'machine', 'strength'),
  (null, 'Reverse Pec Deck', 'shoulders', 'machine', 'strength'),
  (null, 'Machine Lateral Raise', 'shoulders', 'machine', 'strength'),
  (null, 'Assisted Pull-up', 'back', 'machine', 'strength'),
  (null, 'Rope Hammer Curl', 'biceps', 'cable', 'strength'),
  (null, 'Hip Thrust Machine', 'glutes', 'machine', 'strength'),
  (null, 'Dumbbell Hip Thrust', 'glutes', 'dumbbell', 'strength'),
  (null, 'Standing Cable Leg Curl', 'hamstrings', 'cable', 'strength'),
  (null, 'Leg Press Calf Raise', 'calves', 'machine', 'strength'),
  (null, 'Hanging Knee Raise', 'core', 'bodyweight', 'strength'),
  (null, 'Reverse Crunch', 'core', 'bodyweight', 'strength');

update public.exercises e set focus = v.focus, pattern = v.pattern
from (values
  ('Bench Press', 'Mid chest, triceps', 'horizontal_press'),
  ('Dumbbell Bench Press', 'Mid chest', 'horizontal_press'),
  ('Chest Press Machine', 'Mid chest', 'horizontal_press'),
  ('Smith Machine Bench Press', 'Mid chest', 'horizontal_press'),
  ('Push-up', 'Chest, triceps', 'horizontal_press'),
  ('Chest Dip', 'Lower chest, triceps', 'horizontal_press'),
  ('Incline Bench Press', 'Upper chest', 'incline_press'),
  ('Incline Dumbbell Press', 'Upper chest', 'incline_press'),
  ('Incline Chest Press Machine', 'Upper chest', 'incline_press'),
  ('Dumbbell Fly', 'Chest stretch', 'chest_fly'),
  ('Pec Deck', 'Inner chest', 'chest_fly'),
  ('Cable Crossover', 'Inner and lower chest', 'chest_fly'),
  ('Lat Pulldown', 'Lats', 'vertical_pull'),
  ('Pull-up', 'Lats', 'vertical_pull'),
  ('Chin-up', 'Lats, biceps', 'vertical_pull'),
  ('Assisted Pull-up', 'Lats', 'vertical_pull'),
  ('Straight-Arm Pulldown', 'Lats', 'lat_isolation'),
  ('Barbell Row', 'Mid back, lats', 'row'),
  ('Dumbbell Row', 'Lats, mid back', 'row'),
  ('Seated Cable Row', 'Mid back', 'row'),
  ('T-Bar Row', 'Mid back, lats', 'row'),
  ('Machine Row', 'Mid back', 'row'),
  ('Deadlift', 'Back, glutes, hamstrings', 'hinge'),
  ('Back Extension', 'Lower back, glutes', 'hinge'),
  ('Romanian Deadlift', 'Hamstrings, glutes', 'hinge'),
  ('Dumbbell Romanian Deadlift', 'Hamstrings, glutes', 'hinge'),
  ('Kettlebell Swing', 'Glutes, hamstrings', 'hinge'),
  ('Overhead Press', 'Front delts, triceps', 'vertical_press'),
  ('Dumbbell Shoulder Press', 'Front and side delts', 'vertical_press'),
  ('Shoulder Press Machine', 'Front delts', 'vertical_press'),
  ('Arnold Press', 'Front and side delts', 'vertical_press'),
  ('Lateral Raise', 'Side delts', 'lateral_raise'),
  ('Cable Lateral Raise', 'Side delts', 'lateral_raise'),
  ('Machine Lateral Raise', 'Side delts', 'lateral_raise'),
  ('Front Raise', 'Front delts', 'front_raise'),
  ('Rear Delt Fly', 'Rear delts', 'rear_delt'),
  ('Reverse Pec Deck', 'Rear delts', 'rear_delt'),
  ('Face Pull', 'Rear delts, upper back', 'rear_delt'),
  ('Shrug', 'Traps', 'shrug'),
  ('Barbell Curl', 'Biceps', 'curl'),
  ('Dumbbell Curl', 'Biceps', 'curl'),
  ('Cable Curl', 'Biceps', 'curl'),
  ('Preacher Curl', 'Biceps, short head', 'curl'),
  ('Incline Dumbbell Curl', 'Biceps, long head', 'curl'),
  ('Hammer Curl', 'Brachialis, forearms', 'hammer_curl'),
  ('Rope Hammer Curl', 'Brachialis, forearms', 'hammer_curl'),
  ('Tricep Pushdown', 'Triceps, outer head', 'triceps_pushdown'),
  ('Dumbbell Kickback', 'Triceps, outer head', 'triceps_pushdown'),
  ('Overhead Tricep Extension', 'Triceps, long head', 'triceps_overhead'),
  ('Skull Crusher', 'Triceps, long head', 'triceps_overhead'),
  ('Close-Grip Bench Press', 'Triceps, chest', 'triceps_press'),
  ('Tricep Dip', 'Triceps', 'triceps_press'),
  ('Wrist Curl', 'Forearms', 'wrist_curl'),
  ('Squat', 'Quads, glutes', 'squat'),
  ('Front Squat', 'Quads', 'squat'),
  ('Goblet Squat', 'Quads, glutes', 'squat'),
  ('Leg Press', 'Quads, glutes', 'squat'),
  ('Hack Squat', 'Quads', 'squat'),
  ('Smith Machine Squat', 'Quads, glutes', 'squat'),
  ('Bulgarian Split Squat', 'Quads, glutes, one leg', 'lunge'),
  ('Walking Lunge', 'Quads, glutes', 'lunge'),
  ('Step-up', 'Quads, glutes', 'lunge'),
  ('Leg Extension', 'Quads', 'knee_ext'),
  ('Lying Leg Curl', 'Hamstrings', 'knee_flex'),
  ('Seated Leg Curl', 'Hamstrings', 'knee_flex'),
  ('Standing Cable Leg Curl', 'Hamstrings', 'knee_flex'),
  ('Hip Thrust', 'Glutes', 'hip_thrust'),
  ('Hip Thrust Machine', 'Glutes', 'hip_thrust'),
  ('Dumbbell Hip Thrust', 'Glutes', 'hip_thrust'),
  ('Glute Bridge', 'Glutes', 'hip_thrust'),
  ('Cable Kickback', 'Glutes', 'glute_kickback'),
  ('Hip Abduction Machine', 'Outer glutes', 'abduction'),
  ('Hip Adduction Machine', 'Inner thighs', 'adduction'),
  ('Standing Calf Raise', 'Calves', 'calf'),
  ('Seated Calf Raise', 'Calves, soleus', 'calf'),
  ('Leg Press Calf Raise', 'Calves', 'calf'),
  ('Crunch', 'Upper abs', 'core_flex'),
  ('Cable Crunch', 'Upper abs', 'core_flex'),
  ('Hanging Leg Raise', 'Lower abs', 'leg_raise'),
  ('Hanging Knee Raise', 'Lower abs', 'leg_raise'),
  ('Reverse Crunch', 'Lower abs', 'leg_raise'),
  ('Plank', 'Whole core', 'core_hold'),
  ('Side Plank', 'Obliques', 'core_hold'),
  ('Dead Bug', 'Deep core', 'core_hold'),
  ('Ab Wheel Rollout', 'Whole core', 'core_hold'),
  ('Russian Twist', 'Obliques', 'core_rotation'),
  ('Burpee', 'Full body', 'conditioning'),
  ('Clean and Press', 'Full body', 'conditioning'),
  ('Farmer''s Walk', 'Grip, traps, core', 'carry'),
  ('Treadmill', 'Heart and lungs', 'cardio'),
  ('Incline Walk', 'Heart and lungs', 'cardio'),
  ('Cycling', 'Heart and lungs', 'cardio'),
  ('Elliptical', 'Heart and lungs', 'cardio'),
  ('Rowing Machine', 'Heart and lungs', 'cardio'),
  ('Stair Climber', 'Heart and lungs', 'cardio'),
  ('Outdoor Run', 'Heart and lungs', 'cardio'),
  ('Walk', 'Heart and lungs', 'cardio'),
  ('Skipping Rope', 'Heart and lungs', 'cardio')
) as v(name, focus, pattern)
where e.owner_id is null and e.name = v.name;

-- 3. The two programmes. Same Day number, same area, so you can train together.
--    Skips anyone who already has a routine with that name.
create function pg_temp.seed_routine(
  person text, routine_name text, routine_notes text, pos int, items jsonb
) returns void language plpgsql as $$
declare
  owner uuid;
  rid uuid;
begin
  select id into owner from public.profiles where name = person;
  if owner is null
    or exists (select 1 from public.routines where owner_id = owner and name = routine_name)
  then
    return;
  end if;
  insert into public.routines (owner_id, name, notes, position)
  values (owner, routine_name, routine_notes, pos)
  returning id into rid;
  insert into public.routine_exercises
    (routine_id, exercise_id, position, sets, reps_min, reps_max, rest_s, notes)
  select rid, e.id, (i.ord - 1)::int, (i.item ->> 1)::int, (i.item ->> 2)::int,
    (i.item ->> 3)::int, (i.item ->> 4)::int, i.item ->> 5
  from jsonb_array_elements(items) with ordinality as i(item, ord)
  join public.exercises e on e.owner_id is null and e.name = i.item ->> 0;
end $$;

-- [exercise, sets, reps from, reps to, rest seconds, note]
select pg_temp.seed_routine('nishadshanid', 'Day 1 · Legs',
  'One of the most important days. Keep 1–3 reps in reserve. When every set reaches the top of the range with good form, add weight and start near the bottom again. 60–80 min is plenty.',
  0, '[
    ["Squat", 3, 6, 10, 150, null],
    ["Leg Press", 3, 8, 12, 120, null],
    ["Romanian Deadlift", 3, 8, 12, 120, null],
    ["Leg Extension", 2, 10, 15, 90, null],
    ["Lying Leg Curl", 2, 10, 15, 90, null],
    ["Standing Calf Raise", 3, 12, 15, 60, null],
    ["Walking Lunge", 2, 10, 10, 90, "Optional, 10 each leg. Skip if the session runs long."]
  ]');
select pg_temp.seed_routine('nishadshanid', 'Day 2 · Back + Biceps',
  'Keep 1–3 reps in reserve. When every set reaches the top of the range, add weight.',
  1, '[
    ["Lat Pulldown", 3, 8, 12, 120, null],
    ["Barbell Row", 3, 8, 12, 120, null],
    ["Seated Cable Row", 3, 8, 12, 120, null],
    ["Dumbbell Row", 2, 10, 12, 90, "One arm at a time"],
    ["Barbell Curl", 3, 8, 12, 90, null],
    ["Hammer Curl", 2, 10, 15, 90, null]
  ]');
select pg_temp.seed_routine('nishadshanid', 'Day 3 · Shoulders + Abs',
  'Abs: slow, controlled reps beat hundreds of fast ones. Keep 1–3 reps in reserve elsewhere.',
  2, '[
    ["Overhead Press", 3, 6, 10, 150, null],
    ["Lateral Raise", 3, 12, 15, 90, null],
    ["Rear Delt Fly", 3, 12, 15, 90, null],
    ["Face Pull", 2, 12, 15, 90, null],
    ["Cable Crunch", 3, 10, 15, 60, null],
    ["Hanging Knee Raise", 3, 8, 15, 60, null],
    ["Plank", 3, null, null, 60, "30–60 sec"]
  ]');
select pg_temp.seed_routine('nishadshanid', 'Day 4 · Chest + Triceps',
  'Keep 1–3 reps in reserve. When every set reaches the top of the range, add weight.',
  3, '[
    ["Bench Press", 3, 6, 10, 150, null],
    ["Incline Dumbbell Press", 3, 8, 12, 120, null],
    ["Pec Deck", 3, 10, 15, 90, null],
    ["Chest Press Machine", 2, 10, 12, 90, null],
    ["Tricep Pushdown", 3, 10, 15, 90, "Rope"],
    ["Overhead Tricep Extension", 2, 10, 15, 90, null]
  ]');
select pg_temp.seed_routine('nishadshanid', 'Day 5 · Full Body',
  'Quality extra volume, not another max-effort day. Leave a few reps in the tank.',
  4, '[
    ["Goblet Squat", 3, 8, 12, 120, null],
    ["Incline Dumbbell Press", 3, 8, 12, 120, null],
    ["Lat Pulldown", 3, 8, 12, 120, null],
    ["Romanian Deadlift", 2, 8, 12, 120, null],
    ["Lateral Raise", 2, 12, 15, 90, null],
    ["Dumbbell Curl", 2, 10, 15, 90, null],
    ["Tricep Pushdown", 2, 10, 15, 90, null]
  ]');

select pg_temp.seed_routine('abilabeegam', 'Day 1 · Lower Body + Glutes',
  'Lift seriously: keep 1–3 reps in reserve, and add weight when every set reaches the top of the range. 50–70 min including the walk.',
  0, '[
    ["Goblet Squat", 3, 8, 12, 120, null],
    ["Leg Press", 3, 10, 12, 120, null],
    ["Romanian Deadlift", 3, 8, 12, 120, null],
    ["Hip Thrust", 3, 10, 15, 120, null],
    ["Lying Leg Curl", 2, 10, 15, 90, null],
    ["Standing Calf Raise", 2, 12, 15, 60, null],
    ["Hip Abduction Machine", 2, 12, 15, 60, "Optional"],
    ["Incline Walk", 1, null, null, 0, "10–15 min"]
  ]');
select pg_temp.seed_routine('abilabeegam', 'Day 2 · Upper Body',
  'Keep 1–3 reps in reserve. No need for extra cardio after this one.',
  1, '[
    ["Lat Pulldown", 3, 8, 12, 120, null],
    ["Seated Cable Row", 3, 8, 12, 120, null],
    ["Chest Press Machine", 3, 8, 12, 120, null],
    ["Dumbbell Shoulder Press", 2, 8, 12, 120, null],
    ["Lateral Raise", 2, 12, 15, 90, null],
    ["Dumbbell Curl", 2, 10, 15, 90, null],
    ["Tricep Pushdown", 2, 10, 15, 90, null]
  ]');
select pg_temp.seed_routine('abilabeegam', 'Day 3 · Lower Body + Core',
  'Keep 1–3 reps in reserve. Core work strengthens; fat loss comes from food, steps and sleep.',
  2, '[
    ["Leg Press", 3, 10, 12, 120, null],
    ["Bulgarian Split Squat", 3, 8, 10, 120, "Each leg"],
    ["Hip Thrust", 3, 10, 15, 120, null],
    ["Leg Extension", 2, 12, 15, 90, null],
    ["Lying Leg Curl", 2, 12, 15, 90, null],
    ["Cable Crunch", 3, 10, 15, 60, null],
    ["Plank", 3, null, null, 60, "30–60 sec"],
    ["Dead Bug", 2, 10, 10, 60, "10 each side"],
    ["Incline Walk", 1, null, null, 0, "10–15 min"]
  ]');
select pg_temp.seed_routine('abilabeegam', 'Day 4 · Upper Body + Cardio',
  'Slightly lighter than Day 2. Keep the cardio moderate, not all-out.',
  3, '[
    ["Lat Pulldown", 3, 10, 12, 120, null],
    ["Dumbbell Row", 3, 10, 12, 90, null],
    ["Chest Press Machine", 3, 10, 12, 120, null],
    ["Lateral Raise", 3, 12, 15, 90, null],
    ["Face Pull", 2, 12, 15, 90, null],
    ["Dumbbell Curl", 2, 10, 15, 90, null],
    ["Tricep Pushdown", 2, 10, 15, 90, null],
    ["Incline Walk", 1, null, null, 0, "20–25 min, moderate"]
  ]');
select pg_temp.seed_routine('abilabeegam', 'Day 5 · Full Body + Cardio',
  'Keep 1–3 reps in reserve. Cardio at a pace you could hold a conversation.',
  4, '[
    ["Goblet Squat", 3, 10, 10, 120, null],
    ["Romanian Deadlift", 3, 10, 10, 120, null],
    ["Chest Press Machine", 3, 10, 10, 120, null],
    ["Lat Pulldown", 3, 10, 10, 120, null],
    ["Hip Thrust", 2, 12, 12, 120, null],
    ["Dumbbell Shoulder Press", 2, 10, 10, 120, null],
    ["Cable Crunch", 3, 12, 15, 60, null],
    ["Incline Walk", 1, null, null, 0, "20–30 min"]
  ]');

-- 4. Five workouts a week, any days; reminders in your 7:30–9 PM slot.
update public.profiles
set weekly_goal = 5, remind_workout_at = '19:00'
where name in ('nishadshanid', 'abilabeegam');
update public.profiles set goal = 'bulk' where name = 'nishadshanid' and goal = 'maintain';
update public.profiles set goal = 'cut' where name = 'abilabeegam' and goal = 'maintain';

-- Her plan: 7,000–10,000 steps a day.
update public.habits h set target = 8000
from public.profiles p
where h.owner_id = p.id and p.name = 'abilabeegam' and h.name = 'Steps' and h.target = 10000;
