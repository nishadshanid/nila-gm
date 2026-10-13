# Phase 0 — Foundation

Copied from Nila's proven base, without Nila's features.

## Build

- New repo `nila-gym`: Next 16.4, Tailwind 4, shadcn base-nova, Vitest, Prettier, ESLint.
- Supabase helpers (`src/lib/supabase/*`), `proxy.ts` login guard, `clean-env` and `env`.
- Theme: Nila's cream light theme and dark mode, Nunito/Fredoka, icon strokes. Gym
  accent colour: green.
- Logo "nila gym" wordmark plus icons (`scripts/make-icons.py`).
- Shell: sidebar (desktop) and bottom nav (phone). Tabs: Today, Workouts, Diet, Body,
  More (Habits, Settings). Pages not built yet show "Coming in phase N".
- Login (sign-ups off in Supabase), sign out.
- Settings: name, colour, theme; phone notifications ("Turn on for this device", "Send a
  test").
- PWA: manifest, service worker (offline page, push, grouped notifications), install
  prompt.
- Migration `0001_foundation`: `profiles` (auto-created on sign-up, with body and target
  fields for later phases), `push_subscriptions`, `is_member()`.
- `/api/cron/tick` stub (Bearer `CRON_SECRET`) and the pg_cron job. Reminders come in
  phase 5; the tick also keeps the free project awake.

## Manual setup (Nishad)

1. Create a new Supabase project (region Mumbai). Connect GitHub → repo `nila-gym`, branch
   `main`, directory `.`.
2. Authentication: turn off sign-ups. Add both users with "Auto confirm".
3. `.env.local`: Supabase URL, anon key, service role key, VAPID keys, `CRON_SECRET`.
4. Vercel: import the repo and add the env vars (secrets as "Secret").
5. SQL Editor: the two vault secrets `nila_gym_app_url` and `nila_gym_cron_secret`.

## Done when

Both of you can log in on the live site and on phones, install it, and get the test push.
