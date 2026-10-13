# Phase 4 — Body progress

## Data

- `body_metrics`: date (one per day per person), weight_kg, body_fat_pct, waist, chest,
  arms, hips, thighs (cm), notes.
- `progress_photos`: date, pose (`front` | `side` | `back`), storage path. Private Storage
  bucket `progress`, owner-only policy. Photos are resized in the browser (about 1080 px,
  JPEG about 200 KB) to stay well inside the free 1 GB.

## Logic (unit tested)

- 7-day moving average of weight, weekly change, change since start; BMI from height.

## UI

- **Body tab:** quick weigh-in, a weight chart (SVG; raw dots and the moving-average line;
  30d / 90d / all), measurement history.
- Photos: grid by date, compare two dates side by side.
