-- Phase 4: weigh-ins, measurements and progress photos.

-- One row per person per day. Everything but the date is optional.
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  weight_kg numeric(5, 2) check (weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  waist_cm numeric(5, 1) check (waist_cm between 20 and 300),
  chest_cm numeric(5, 1) check (chest_cm between 20 and 300),
  arms_cm numeric(5, 1) check (arms_cm between 10 and 100),
  hips_cm numeric(5, 1) check (hips_cm between 20 and 300),
  thighs_cm numeric(5, 1) check (thighs_cm between 10 and 150),
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, date)
);

create trigger body_metrics_updated_at
  before update on public.body_metrics
  for each row execute function public.set_updated_at();

alter table public.body_metrics enable row level security;

create policy "members read body metrics"
  on public.body_metrics for select to authenticated using (public.is_member());
create policy "own body metrics"
  on public.body_metrics for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

-- Progress photos are private: only the person in them can see them.
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  pose text not null default 'front' check (pose in ('front', 'side', 'back')),
  -- "<owner id>/<file>.jpg" in the private `progress` bucket.
  path text not null unique check (length(path) <= 200),
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index progress_photos_owner_date_idx on public.progress_photos (owner_id, date desc);

alter table public.progress_photos enable row level security;

create policy "own progress photos"
  on public.progress_photos for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and split_part(path, '/', 1) = auth.uid()::text);

-- The bucket: private, small JPEG/WebP files only (the app resizes before upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress', 'progress', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Each person's files live in a folder named after their user id.
create policy "read own progress files"
  on storage.objects for select to authenticated
  using (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own progress files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own progress files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
