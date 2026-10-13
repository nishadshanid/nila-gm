# Phase 2 — Diet

## Data

- Targets on `profiles`: kcal, protein_g, carbs_g, fat_g; goal (`cut` | `maintain` |
  `bulk`), activity level, sex, height_cm, birth_year.
- `foods`: name, serving (`100 g` or a unit like "1 roti", "1 egg", "1 scoop") with grams,
  kcal, protein, carbs, fat, fibre. About 150 built-ins (common Kerala/Indian and gym
  foods) plus your own. No paid APIs.
- `meal_entries`: date, meal (`breakfast` | `lunch` | `snack` | `dinner`), food, servings,
  and kcal and macros **snapshotted** so editing a food never changes history.
- `favourite_foods` (owner, food).

## Logic (`src/lib/nutrition.ts`, unit tested)

- Target calculator: Mifflin-St Jeor BMR × activity, ±goal (cut −20%, bulk +10%);
  protein 1.6–2.2 g/kg; fat 25% of kcal; carbs the rest. Shown as a suggestion you can
  edit.
- Day totals and remaining, per-meal totals.

## UI

- **Diet tab:** day picker. Rings for kcal / protein / carbs / fat (SVG). Meals with their
  entries.
- **Add food:** search (built-in + yours), recent and favourites first, servings stepper,
  live macro preview. "Quick add" (just kcal/protein). "Copy yesterday's lunch" per meal.
- **My foods:** create and edit custom foods.
