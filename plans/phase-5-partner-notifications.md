# Phase 5 — Partner & notifications

## Partner

- Switch to "Aabi" / "Nishad" (read-only) on Today, Workouts, Diet, Body: see their day,
  streaks, PRs and weight trend. You can't edit their data (RLS).
- Pushes to the partner (phone only): "Aabi finished Leg day 💪 (45 min, 3 PRs)"; new PR.

## Reminder tick (`/api/cron/tick`, every 15 min, unit-tested scheduling)

Per-person settings, each on or off:

- Workout day: at a set time on scheduled days, if not started yet.
- Water nudges: every N hours between a start and end time, if behind the target.
- Log meals: in the evening, if fewer than 2 meals logged.
- Weigh-in: on a chosen weekday morning.
- `notification_log` makes each send happen once.

## Stats

- Weekly: workouts done vs planned, total volume, average kcal/protein vs target, weight
  change, water and habit hit-rates. Simple and light.
