-- Routines are a cycle, not numbered days: drop the "Day N · " from names, and
-- let each person say what's next (e.g. "did legs yesterday") until they finish one.
update public.routines set name = regexp_replace(name, '^Day [0-9]+ · ', '')
where name ~ '^Day [0-9]+ · ';

alter table public.profiles
  add column next_routine_id uuid references public.routines on delete set null;
