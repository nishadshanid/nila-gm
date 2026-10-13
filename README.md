# Nila Gym

A private app for the two of us for gym and diet: workout plans and logging, meals with
calorie and macro targets, body progress, water and habits, and phone reminders. It's a
sibling of [Nila](https://github.com/nishadshanid/nila) with the same look and stack.
The plans for each phase are in [`plans/`](plans/00-overview.md).

Stack: Next.js 16 · Supabase (Postgres, Auth, RLS, Storage) · Vercel · Tailwind + shadcn/ui ·
web push. Everything runs on free tiers. Times are in Asia/Kolkata, and weeks start on Monday.

## First-time setup

### 1. Supabase (a new project, separate from Nila)

1. Create a project (region: Mumbai). In **Project Settings → Integrations → GitHub**,
   connect this repo, branch `main`, Supabase directory `.`. Migrations in
   `supabase/migrations/` then apply on every push to `main`.
2. **Authentication → Sign In / Providers**: keep Email on and turn **off** "Allow new
   users to sign up".
3. **Authentication → Users → Add user**: create both accounts (tick "Auto confirm user").
4. **Authentication → URL Configuration**: set the Site URL to the Vercel URL.

### 2. Local env

```bash
cp .env.example .env.local   # fill in the keys (never commit them)
npm install
npm run dev
```

### 3. Vercel

Import the repo and add the variables from `.env.example`. Mark
`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` and `CRON_SECRET` as **Secret**.

### 4. The 15-minute tick

In the Supabase SQL Editor:

```sql
select vault.create_secret('https://<your-app>.vercel.app', 'nila_gym_app_url');
select vault.create_secret('<same value as CRON_SECRET>', 'nila_gym_cron_secret');
```

Check it after 15 minutes:
`select status_code, created from net._http_response order by created desc limit 3;`

## Scripts

`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`
