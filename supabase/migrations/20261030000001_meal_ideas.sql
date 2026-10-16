-- Meal ideas: saved combos of foods you can log in one tap, on any day, at any meal.
-- Loads Nishad's and his wife's diet plans as ideas (not a fixed day), and sets their
-- targets from what a typical plan day adds up to.

create table public.meal_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  position int not null default 0,
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  name text not null check (length(name) between 1 and 60),
  -- When it tends to fit, e.g. "Wake-up", "11 AM", "Pre-workout". Just a hint.
  hint text check (length(hint) <= 30),
  note text check (length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_ideas_owner_idx on public.meal_ideas (owner_id, meal, position);

create trigger meal_ideas_updated_at
  before update on public.meal_ideas
  for each row execute function public.set_updated_at();

create table public.meal_idea_items (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.meal_ideas on delete cascade,
  position int not null default 0,
  food_id uuid not null references public.foods on delete cascade,
  amount numeric(7, 2) not null check (amount > 0 and amount <= 5000),
  -- "If you're still hungry", "if available": unticked by default when logging.
  optional boolean not null default false
);
create index meal_idea_items_idea_idx on public.meal_idea_items (idea_id, position);

alter table public.meal_ideas enable row level security;
alter table public.meal_idea_items enable row level security;

create policy "members read meal ideas"
  on public.meal_ideas for select to authenticated using (public.is_member());
create policy "own meal ideas"
  on public.meal_ideas for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

create policy "members read meal idea items"
  on public.meal_idea_items for select to authenticated using (public.is_member());
create policy "own meal idea items"
  on public.meal_idea_items for all to authenticated
  using (exists (select 1 from public.meal_ideas i where i.id = idea_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.meal_ideas i where i.id = idea_id and i.owner_id = auth.uid()));

-- Two foods the plans need.
insert into public.foods
  (owner_id, name, unit, serving, default_amount, kcal, protein_g, carbs_g, fat_g, fibre_g)
values
  (null, 'Chicken, home-cooked pieces', 'g', null, 135, 190, 25, 2, 9, 0),
  (null, 'Fruit (one, average)', 'piece', 'fruit', 1, 70, 1, 17, 0.3, 2.5);

-- [food name, amount, optional]
create function pg_temp.idea(
  p_person text, p_meal text, p_name text, p_hint text, p_note text, p_pos int, p_items jsonb
) returns void language plpgsql as $$
declare
  v_owner uuid;
  v_idea uuid;
begin
  select id into v_owner from public.profiles where name = p_person;
  if v_owner is null or exists (
    select 1 from public.meal_ideas i where i.owner_id = v_owner and i.name = p_name and i.meal = p_meal
  ) then
    return;
  end if;
  insert into public.meal_ideas (owner_id, position, meal, name, hint, note)
  values (v_owner, p_pos, p_meal, p_name, p_hint, p_note)
  returning id into v_idea;
  insert into public.meal_idea_items (idea_id, position, food_id, amount, optional)
  select v_idea, (x.ord - 1)::int, f.id, (x.item ->> 1)::numeric,
    coalesce((x.item ->> 2)::boolean, false)
  from jsonb_array_elements(p_items) with ordinality as x(item, ord)
  join public.foods f on f.owner_id is null and f.name = x.item ->> 0;
end $$;

-- Nishad: weight gain.
select pg_temp.idea('nishadshanid', 'breakfast', 'Dates and almonds', 'Wake-up',
  '300–500 ml water first. You don''t need a big breakfast straight after waking.', 0,
  '[["Dates", 2], ["Almonds", 10]]');
select pg_temp.idea('nishadshanid', 'breakfast', 'Idli, eggs and sambar', null,
  'Don''t make breakfast tiny: it''s a chance to get calories in. Banana if you''re still hungry.', 1,
  '[["Idli", 4], ["Egg (whole, boiled)", 2], ["Sambar", 150], ["Banana", 1, true]]');
select pg_temp.idea('nishadshanid', 'breakfast', 'Dosa, eggs and sambar', null, null, 2,
  '[["Dosa, plain", 3], ["Egg (whole, boiled)", 2], ["Sambar", 150]]');
select pg_temp.idea('nishadshanid', 'breakfast', 'Puttu, eggs and kadala', null, null, 3,
  '[["Puttu", 165], ["Egg (whole, boiled)", 2], ["Kadala curry", 110]]');
select pg_temp.idea('nishadshanid', 'breakfast', 'Appam, eggs and chicken curry', null, null, 4,
  '[["Appam", 3], ["Egg (whole, boiled)", 2], ["Chicken curry", 100]]');

select pg_temp.idea('nishadshanid', 'snack', 'Weight-gain smoothie', '11 AM',
  'Blend it all. Carbs, protein, fat and calories in one glass.', 0,
  '[["Milk, toned", 250], ["Banana", 1], ["Oats (dry)", 35], ["Peanut butter", 18], ["Dates", 2]]');
select pg_temp.idea('nishadshanid', 'snack', 'Banana, eggs and milk', '11 AM', null, 1,
  '[["Banana", 1], ["Egg (whole, boiled)", 2], ["Milk, toned", 250]]');
select pg_temp.idea('nishadshanid', 'snack', 'Banana, eggs and peanuts', '11 AM', null, 2,
  '[["Banana", 1], ["Egg (whole, boiled)", 2], ["Peanuts (roasted)", 25]]');
select pg_temp.idea('nishadshanid', 'snack', 'Banana and milk', '4 PM', null, 3,
  '[["Banana", 1], ["Milk, toned", 250]]');
select pg_temp.idea('nishadshanid', 'snack', 'Fruit and peanuts', '4 PM', null, 4,
  '[["Fruit (one, average)", 1], ["Peanuts (roasted)", 22]]');
select pg_temp.idea('nishadshanid', 'snack', 'Milk, dates and peanuts', '4 PM', null, 5,
  '[["Milk, toned", 250], ["Dates", 2], ["Peanuts (roasted)", 15]]');
select pg_temp.idea('nishadshanid', 'snack', 'Banana and coffee', 'Pre-workout',
  'Easy to digest before the gym.', 6,
  '[["Banana", 1], ["Black coffee / black tea", 1, true]]');
select pg_temp.idea('nishadshanid', 'snack', 'Banana and egg', 'Pre-workout',
  'Only if you''re genuinely hungry. No need for 2–3 eggs right before training.', 7,
  '[["Banana", 1], ["Egg (whole, boiled)", 1]]');
select pg_temp.idea('nishadshanid', 'snack', 'Bedtime milk', 'Bedtime',
  'Only if you''re consistently short on calories.', 8,
  '[["Milk, toned", 175]]');

select pg_temp.idea('nishadshanid', 'lunch', 'Rice and chicken', null,
  'One of your biggest meals. Struggling to gain? Go up to 300 g rice before adding more protein.', 0,
  '[["Kerala matta rice (cooked)", 250], ["Chicken, home-cooked pieces", 135], ["Egg (whole, boiled)", 1], ["Thoran", 100], ["Dal (toor, cooked)", 110], ["Curd / dahi", 100, true]]');
select pg_temp.idea('nishadshanid', 'lunch', 'Rice and fish', null, null, 1,
  '[["Kerala matta rice (cooked)", 250], ["Fish curry", 150], ["Egg (whole, boiled)", 1], ["Thoran", 100], ["Dal (toor, cooked)", 110], ["Curd / dahi", 100, true]]');
select pg_temp.idea('nishadshanid', 'lunch', 'Rice, eggs and dal', null,
  'When there''s no chicken.', 2,
  '[["Kerala matta rice (cooked)", 250], ["Egg (whole, boiled)", 3], ["Dal (toor, cooked)", 150], ["Thoran", 100], ["Curd / dahi", 100, true]]');

select pg_temp.idea('nishadshanid', 'dinner', 'Rice, chicken, eggs and milk', 'After the gym', null, 0,
  '[["Kerala matta rice (cooked)", 225], ["Chicken, home-cooked pieces", 135], ["Egg (whole, boiled)", 2], ["Thoran", 100], ["Milk, toned", 250]]');
select pg_temp.idea('nishadshanid', 'dinner', 'Chapati, chicken, eggs and milk', 'After the gym', null, 1,
  '[["Chapati", 3], ["Chicken, home-cooked pieces", 135], ["Egg (whole, boiled)", 2], ["Thoran", 100], ["Milk, toned", 250]]');
select pg_temp.idea('nishadshanid', 'dinner', 'Dosa, chicken, eggs and milk', 'After the gym', null, 2,
  '[["Dosa, plain", 3], ["Chicken, home-cooked pieces", 135], ["Egg (whole, boiled)", 2], ["Sambar", 150], ["Milk, toned", 250]]');

-- His wife: fat loss, same foods, controlled portions.
select pg_temp.idea('abilabeegam', 'breakfast', 'Tea or coffee', 'Morning',
  'Water first. Dates and almonds only if you really enjoy them.', 0,
  '[["Tea with milk and sugar", 1]]');
select pg_temp.idea('abilabeegam', 'breakfast', 'Idli, eggs and sambar', null, null, 1,
  '[["Idli", 2], ["Egg (whole, boiled)", 2], ["Sambar", 150]]');
select pg_temp.idea('abilabeegam', 'breakfast', 'Dosa, eggs and sambar', null, null, 2,
  '[["Dosa, plain", 1], ["Egg (whole, boiled)", 2], ["Sambar", 150]]');
select pg_temp.idea('abilabeegam', 'breakfast', 'Puttu, egg and kadala', null, null, 3,
  '[["Puttu", 110], ["Egg (whole, boiled)", 1], ["Kadala curry", 75]]');
select pg_temp.idea('abilabeegam', 'breakfast', 'Appam, eggs and vegetable curry', null, null, 4,
  '[["Appam", 2], ["Egg (whole, boiled)", 2], ["Mixed vegetable curry", 150]]');

select pg_temp.idea('abilabeegam', 'snack', 'Small banana', '11 AM',
  'Only if you''re hungry. No need to eat every 2–3 hours.', 0,
  '[["Small banana (poovan / robusta)", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Curd', '11 AM', null, 1,
  '[["Curd / dahi", 125]]');
select pg_temp.idea('abilabeegam', 'snack', 'Egg and fruit', '11 AM', null, 2,
  '[["Egg (whole, boiled)", 1], ["Fruit (one, average)", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Fruit and black tea', '4 PM',
  'Tea without much sugar. Try not to make tea + biscuits + fried snacks a habit.', 3,
  '[["Fruit (one, average)", 1], ["Black coffee / black tea", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Curd and fruit', '4 PM', null, 4,
  '[["Curd / dahi", 125], ["Fruit (one, average)", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Buttermilk and fruit', '4 PM', null, 5,
  '[["Buttermilk / moru", 200], ["Fruit (one, average)", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Peanuts and fruit', '4 PM', null, 6,
  '[["Peanuts (roasted)", 12], ["Fruit (one, average)", 1]]');
select pg_temp.idea('abilabeegam', 'snack', 'Half a banana and coffee', 'Pre-workout',
  'That''s enough for most workouts.', 7,
  '[["Banana", 0.5], ["Black coffee / black tea", 1, true]]');
select pg_temp.idea('abilabeegam', 'snack', 'Milk', 'Any time',
  'About 250 ml a day: with breakfast, as a snack or in the evening.', 8,
  '[["Milk, toned", 250]]');

select pg_temp.idea('abilabeegam', 'lunch', 'Rice, chicken, egg and vegetables', null,
  'Plate: half vegetables, a quarter chicken / egg / dal, a quarter rice.', 0,
  '[["Kerala matta rice (cooked)", 125], ["Chicken, home-cooked pieces", 110], ["Egg (whole, boiled)", 1], ["Thoran", 150], ["Dal (toor, cooked)", 110], ["Curd / dahi", 100]]');

select pg_temp.idea('abilabeegam', 'dinner', 'Chapati, chicken and vegetables', 'After the gym', null, 0,
  '[["Chapati", 2], ["Chicken, home-cooked pieces", 110], ["Egg (whole, boiled)", 1], ["Thoran", 150], ["Curd / dahi", 100]]');
select pg_temp.idea('abilabeegam', 'dinner', 'Rice, chicken and vegetables', 'After the gym',
  'Rice at night doesn''t cause belly fat; the day''s total is what matters.', 1,
  '[["Kerala matta rice (cooked)", 125], ["Chicken, home-cooked pieces", 110], ["Egg (whole, boiled)", 1], ["Thoran", 150]]');
select pg_temp.idea('abilabeegam', 'dinner', 'Dosa, chicken and sambar', 'After the gym', null, 2,
  '[["Dosa, plain", 1], ["Chicken, home-cooked pieces", 110], ["Egg (whole, boiled)", 1], ["Sambar", 150]]');

-- Targets: what a typical plan day adds up to (non-optional items).
create function pg_temp.set_targets(person text, ideas text[], water int) returns void
language sql as $$
  with day as (
    select
      sum(f.kcal * case when f.unit = 'piece' then it.amount else it.amount / 100 end) as kcal,
      sum(f.protein_g * case when f.unit = 'piece' then it.amount else it.amount / 100 end) as protein,
      sum(f.carbs_g * case when f.unit = 'piece' then it.amount else it.amount / 100 end) as carbs,
      sum(f.fat_g * case when f.unit = 'piece' then it.amount else it.amount / 100 end) as fat
    from public.profiles p
    join public.meal_ideas i on i.owner_id = p.id and i.name = any(ideas)
    join public.meal_idea_items it on it.idea_id = i.id and not it.optional
    join public.foods f on f.id = it.food_id
    where p.name = person
  )
  update public.profiles p set
    target_kcal = round(day.kcal / 50) * 50,
    target_protein_g = round(day.protein),
    target_carbs_g = round(day.carbs),
    target_fat_g = round(day.fat),
    target_water_ml = water
  from day
  where p.name = person and day.kcal is not null
$$;

select pg_temp.set_targets('nishadshanid', array[
  'Dates and almonds', 'Idli, eggs and sambar', 'Weight-gain smoothie', 'Rice and chicken',
  'Banana and milk', 'Banana and coffee', 'Rice, chicken, eggs and milk'], 3000);
select pg_temp.set_targets('abilabeegam', array[
  'Idli, eggs and sambar', 'Rice, chicken, egg and vegetables', 'Half a banana and coffee',
  'Chapati, chicken and vegetables', 'Milk'], 2250);

update public.profiles set sex = 'female', height_cm = 152
where name = 'abilabeegam' and sex is null;
