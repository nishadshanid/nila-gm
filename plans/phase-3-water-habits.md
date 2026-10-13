# Phase 3 — Water & habits

## Data

- `water_logs`: date, ml (each tap is a row, so undo is easy).
- `habits` (owner, name, emoji, kind `check` | `number`, target, unit, active, position):
  starter set: Steps (10,000), Creatine, Sleep (7 h), Vitamins, No sugar.
- `habit_logs`: habit, date, value.

## Logic (`src/lib/habits.ts`, unit tested)

- Streaks (consecutive days meeting the target, today not breaking the streak until it
  ends).
- Day complete = workout done or rest day, water target met, habits met.

## UI

- Water card: glasses (250 ml, editable size), one tap to add, progress bar.
- Habits checklist on Today with streak flames 🔥.
- Day-complete celebration (Nila's confetti), once per day.
