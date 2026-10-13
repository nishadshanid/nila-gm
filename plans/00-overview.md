# Nila Gym — Overview

A private app for the two of us for gym and diet: workout plans and logging, meals with
calorie and macro targets, body progress, water and habits, and phone reminders. It's a
sibling of Nila (~/Work/Nila): same look, same stack, **₹0 to run**.

## Stack (free tiers)

| Layer         | Choice                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| App           | Next.js 16 (App Router, `proxy`, cacheComponents), server actions                   |
| UI            | Tailwind 4, shadcn base-nova (Base UI), lucide-react, Nunito + Fredoka              |
| DB / Auth     | A **separate** Supabase Free project: Postgres, Auth, RLS, Storage, pg_cron, pg_net |
| Hosting       | Vercel Hobby                                                                        |
| Notifications | Web push only (web-push + VAPID). No email.                                         |
| Dates         | date-fns 4 + @date-fns/tz. **Timezone Asia/Kolkata, week starts Monday**            |
| Quality       | Zod 4, Vitest                                                                       |
| Install       | PWA (manifest + service worker)                                                     |

## Global conventions

- Every user row has `owner_id` (default `auth.uid()`).
- RLS: both of us can **read** everything (to cheer each other on); only the owner can
  insert, change or delete their own rows. Progress photos are the exception: owner only,
  unless that changes in phase 4.
- Units: kg, cm, ml, kcal, grams.
- All date maths goes through `src/lib/dates.ts` (IST).
- Mutations are server actions in `src/app/(app)/<page>/actions.ts`, validated with Zod.
- Migrations live in `supabase/migrations/`. The Supabase GitHub integration applies them
  on push to `main`. Push a migration and let it apply before pushing code that needs it.
- Performance matters: no heavy chart or UI libraries; charts are small SVGs.

## Phases

| #   | File                                                                 | Outcome                                                         |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0   | [phase-0-foundation.md](phase-0-foundation.md)                       | Login, shell, settings, PWA, push, deployed                     |
| 1   | [phase-1-workouts.md](phase-1-workouts.md)                           | Exercises, routines, weekly schedule, live workout logging, PRs |
| 2   | [phase-2-diet.md](phase-2-diet.md)                                   | Targets, food list, meal log with macro rings                   |
| 3   | [phase-3-water-habits.md](phase-3-water-habits.md)                   | Water, habits, streaks, day-complete                            |
| 4   | [phase-4-body.md](phase-4-body.md)                                   | Weigh-ins, measurements, charts, progress photos                |
| 5   | [phase-5-partner-notifications.md](phase-5-partner-notifications.md) | Partner view, pushes, reminder tick, weekly stats               |
| 6   | [phase-6-polish.md](phase-6-polish.md)                               | Today dashboard, offline logging, search, polish                |
