-- Realtime: the partner page updates as the other person logs.
-- RLS still applies (both of us can read these; progress photos aren't included).
do $$
declare
  t text;
begin
  foreach t in array array[
    'workouts', 'meal_entries', 'water_logs', 'habit_logs', 'body_metrics'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
