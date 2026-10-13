# Phase 1 — Workouts

## Data

- `exercises`: name, muscle (chest/back/shoulders/biceps/triceps/legs/glutes/core/
  cardio/full body), equipment (barbell/dumbbell/machine/cable/bodyweight/band/other), kind
  (`strength` | `cardio` | `time`). About 80 built-ins (`owner_id` null) plus your own.
- `routines` (name, notes, color) → `routine_exercises` (position, sets, rep range, rest
  seconds, notes).
- `routine_schedule`: (owner, weekday 1–7) → routine, or rest day.
- `workouts`: date, routine (nullable for freestyle), started_at, ended_at, notes, feeling
  1–5.
- `workout_sets`: workout, exercise, position, set_no, reps, weight_kg, duration_s,
  distance_m, rpe (optional), done, is_warmup.

## Logic (`src/lib/workout.ts`, unit tested)

- Today's routine from the weekly schedule.
- Previous performance per exercise ("last time 3×10 @ 40 kg").
- Estimated 1RM (Epley: `w × (1 + reps/30)`), volume (Σ reps × weight), PR detection
  (heaviest weight, best e1RM, most reps at a weight).

## UI

- **Workouts tab:** this week's schedule, routines list (create/edit/reorder exercises),
  history.
- **Start workout** → live logger. One card per exercise. Each set row shows the previous
  value as a placeholder, and you can tap ✓ to copy and complete it. Big tap targets. Rest
  timer starts on ✓ (with a buzz and a sound at 0). Add exercise / add set / swap
  exercise.
- The live workout is saved as you go (each ✓ is a server action) so a refresh or
  closing the app loses nothing; there's a "Resume workout" banner.
- **Finish** → summary: duration, volume, sets, new PRs 🎉.
- **Exercise detail:** history and best lifts.
