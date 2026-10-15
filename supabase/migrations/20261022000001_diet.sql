-- Phase 2: foods, the meal log and favourites.
-- Both of us can read everything; only the owner changes their own rows.

-- Nutrition is per 100 g / 100 ml when unit is 'g' / 'ml', or per one `serving`
-- (a roti, an egg, a scoop) when unit is 'piece'.
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  -- null = built in (seeded below), otherwise someone's own food.
  owner_id uuid default auth.uid() references public.profiles on delete cascade,
  name text not null check (length(name) between 1 and 80),
  unit text not null default 'g' check (unit in ('g', 'ml', 'piece')),
  -- What one piece is called ("roti", "scoop"). Only for unit 'piece'.
  serving text check (length(serving) <= 30),
  -- The amount the add-food screen starts at: grams, ml or pieces.
  default_amount numeric(7, 2) not null default 100 check (default_amount > 0 and default_amount <= 5000),
  kcal numeric(7, 1) not null check (kcal between 0 and 2000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 500),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 500),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 500),
  fibre_g numeric(6, 1) not null default 0 check (fibre_g between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger foods_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;

create policy "members read foods"
  on public.foods for select to authenticated using (public.is_member());
create policy "add own foods"
  on public.foods for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member());
create policy "change own foods"
  on public.foods for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own foods"
  on public.foods for delete to authenticated using (owner_id = auth.uid());

-- One row per thing eaten. Name, amount and nutrition are copied from the food
-- when logged, so editing or deleting a food never rewrites history.
create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  -- null for a quick add (just calories and protein).
  food_id uuid references public.foods on delete set null,
  name text not null check (length(name) between 1 and 80),
  amount numeric(7, 2) not null default 1 check (amount > 0 and amount <= 5000),
  unit text check (unit in ('g', 'ml', 'piece')),
  serving text check (length(serving) <= 30),
  -- Totals for this amount.
  kcal numeric(7, 1) not null check (kcal between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 1000),
  fibre_g numeric(6, 1) not null default 0 check (fibre_g between 0 and 1000),
  created_at timestamptz not null default now()
);
create index meal_entries_owner_date_idx on public.meal_entries (owner_id, date, created_at);

alter table public.meal_entries enable row level security;

create policy "members read meal entries"
  on public.meal_entries for select to authenticated using (public.is_member());
create policy "own meal entries"
  on public.meal_entries for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

create table public.favourite_foods (
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  food_id uuid not null references public.foods on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, food_id)
);

alter table public.favourite_foods enable row level security;

create policy "members read favourites"
  on public.favourite_foods for select to authenticated using (public.is_member());
create policy "own favourites"
  on public.favourite_foods for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_member());

-- Built-in foods. Typical home-style values (IFCT / USDA); brands and recipes vary,
-- so treat them as good estimates. Cooked weights unless the name says "dry".
insert into public.foods
  (owner_id, name, unit, serving, default_amount, kcal, protein_g, carbs_g, fat_g, fibre_g)
values
  -- Rice, breads and breakfast (per 100 g, or per piece)
  (null, 'Rice, white (cooked)', 'g', null, 150, 130, 2.7, 28.2, 0.3, 0.4),
  (null, 'Kerala matta rice (cooked)', 'g', null, 200, 125, 2.6, 26.5, 0.8, 1.5),
  (null, 'Brown rice (cooked)', 'g', null, 150, 112, 2.3, 23.5, 0.8, 1.8),
  (null, 'Basmati rice (cooked)', 'g', null, 150, 121, 3.5, 25.2, 0.4, 0.4),
  (null, 'Ghee rice', 'g', null, 200, 190, 3, 29, 7, 0.4),
  (null, 'Chicken biryani', 'g', null, 300, 170, 8, 20, 6.5, 0.8),
  (null, 'Veg pulao', 'g', null, 200, 140, 3, 23, 4, 1.3),
  (null, 'Curd rice', 'g', null, 200, 125, 3.5, 19, 3.8, 0.4),
  (null, 'Lemon rice', 'g', null, 200, 165, 2.8, 27, 5, 0.8),
  (null, 'Chicken fried rice', 'g', null, 300, 170, 7, 22, 6, 1),
  (null, 'Chapati', 'piece', 'chapati', 2, 104, 3.1, 18, 2.3, 2.7),
  (null, 'Phulka (no oil)', 'piece', 'phulka', 2, 70, 2.4, 14, 0.4, 2),
  (null, 'Paratha, plain', 'piece', 'paratha', 1, 200, 4.5, 27, 8.5, 3),
  (null, 'Aloo paratha', 'piece', 'paratha', 1, 260, 5.5, 36, 10, 3.5),
  (null, 'Kerala porotta', 'piece', 'porotta', 2, 280, 5.5, 38, 11.5, 1.2),
  (null, 'Puri', 'piece', 'puri', 3, 100, 1.8, 11, 5.5, 0.8),
  (null, 'Naan', 'piece', 'naan', 1, 260, 8.7, 45, 5, 2),
  (null, 'Bread, white', 'piece', 'slice', 2, 67, 2.2, 12.6, 0.8, 0.6),
  (null, 'Bread, whole wheat', 'piece', 'slice', 2, 69, 3.6, 11.6, 0.9, 1.9),
  (null, 'Idli', 'piece', 'idli', 3, 58, 2, 12, 0.2, 0.6),
  (null, 'Dosa, plain', 'piece', 'dosa', 2, 135, 3.2, 21, 4.2, 1),
  (null, 'Masala dosa', 'piece', 'dosa', 1, 350, 7, 50, 13, 3.5),
  (null, 'Ragi dosa', 'piece', 'dosa', 2, 110, 3, 18, 3, 2.5),
  (null, 'Uttapam', 'piece', 'uttapam', 1, 200, 5, 30, 6, 2),
  (null, 'Appam', 'piece', 'appam', 2, 110, 2, 21, 2, 0.5),
  (null, 'Idiyappam', 'piece', 'idiyappam', 3, 55, 1, 12, 0.2, 0.3),
  (null, 'Puttu', 'g', null, 150, 180, 3.3, 34, 3.5, 1.2),
  (null, 'Pathiri', 'piece', 'pathiri', 2, 70, 1.3, 15, 0.3, 0.4),
  (null, 'Upma', 'g', null, 200, 150, 3.5, 21, 5.5, 1.5),
  (null, 'Poha', 'g', null, 200, 160, 3, 25, 5.5, 1.2),
  (null, 'Pongal', 'g', null, 200, 150, 4, 21, 5.5, 1.5),
  (null, 'Oats (dry)', 'g', null, 40, 389, 16.9, 66.3, 6.9, 10.6),
  (null, 'Muesli (dry)', 'g', null, 40, 370, 10, 66, 6, 8),
  (null, 'Cornflakes', 'g', null, 30, 378, 7, 84, 0.9, 3),
  (null, 'Instant noodles (1 pack)', 'piece', 'pack', 1, 310, 7.5, 43, 12, 2),
  (null, 'Pasta (cooked)', 'g', null, 200, 158, 5.8, 31, 0.9, 1.8),
  (null, 'Quinoa (cooked)', 'g', null, 150, 120, 4.4, 21.3, 1.9, 2.8),
  (null, 'Potato (boiled)', 'g', null, 150, 87, 1.9, 20, 0.1, 1.8),
  (null, 'Sweet potato (boiled)', 'g', null, 150, 86, 1.6, 20, 0.1, 3),
  (null, 'Tapioca / kappa (boiled)', 'g', null, 200, 135, 1, 32, 0.3, 1.8),

  -- Dal, pulses, nuts and seeds
  (null, 'Dal (toor, cooked)', 'g', null, 150, 105, 6, 15, 2.5, 3),
  (null, 'Moong dal (cooked)', 'g', null, 150, 105, 7, 16, 1.5, 3.5),
  (null, 'Sambar', 'g', null, 150, 65, 3, 9, 2, 2.5),
  (null, 'Rasam', 'g', null, 150, 30, 1, 5, 0.8, 0.5),
  (null, 'Rajma curry', 'g', null, 150, 130, 6, 17, 4, 5),
  (null, 'Chana masala', 'g', null, 150, 150, 7, 19, 5.5, 6),
  (null, 'Kadala curry', 'g', null, 150, 140, 7, 17, 5, 6),
  (null, 'Cherupayar (green gram) curry', 'g', null, 150, 110, 7, 15, 2.8, 4.5),
  (null, 'Chickpeas (boiled)', 'g', null, 100, 164, 8.9, 27.4, 2.6, 7.6),
  (null, 'Kidney beans (boiled)', 'g', null, 100, 127, 8.7, 22.8, 0.5, 6.4),
  (null, 'Moong sprouts', 'g', null, 100, 30, 3, 6, 0.2, 1.8),
  (null, 'Soya chunks (dry)', 'g', null, 30, 345, 52, 33, 0.5, 13),
  (null, 'Tofu', 'g', null, 100, 76, 8, 1.9, 4.8, 0.3),
  (null, 'Peanuts (roasted)', 'g', null, 30, 585, 24, 21, 49, 8),
  (null, 'Peanut butter', 'g', null, 16, 590, 25, 20, 50, 6),
  (null, 'Almonds', 'g', null, 20, 579, 21, 22, 50, 12.5),
  (null, 'Cashews', 'g', null, 20, 553, 18, 30, 44, 3.3),
  (null, 'Walnuts', 'g', null, 20, 654, 15, 14, 65, 6.7),
  (null, 'Chia seeds', 'g', null, 10, 486, 16.5, 42, 31, 34),
  (null, 'Flax seeds', 'g', null, 10, 534, 18, 29, 42, 27),
  (null, 'Roasted chana', 'g', null, 30, 369, 22, 58, 5, 17),
  (null, 'Makhana (roasted)', 'g', null, 20, 350, 9.7, 77, 0.1, 14.5),

  -- Eggs and dairy
  (null, 'Egg (whole, boiled)', 'piece', 'egg', 2, 72, 6.3, 0.4, 4.8, 0),
  (null, 'Egg white', 'piece', 'egg white', 4, 17, 3.6, 0.2, 0.1, 0),
  (null, 'Omelette (2 eggs)', 'piece', 'omelette', 1, 190, 13, 1.5, 15, 0.2),
  (null, 'Egg curry', 'g', null, 150, 150, 8, 5, 11, 1),
  (null, 'Milk, toned', 'ml', null, 200, 58, 3.1, 4.7, 3, 0),
  (null, 'Milk, full cream', 'ml', null, 200, 85, 3.2, 4.8, 6, 0),
  (null, 'Milk, skimmed', 'ml', null, 200, 35, 3.4, 5, 0.1, 0),
  (null, 'Curd / dahi', 'g', null, 100, 60, 3.1, 4.7, 3.3, 0),
  (null, 'Greek yogurt (plain, low fat)', 'g', null, 150, 70, 9, 4, 2, 0),
  (null, 'Buttermilk / moru', 'ml', null, 200, 25, 1.5, 2, 1, 0),
  (null, 'Lassi, sweet', 'ml', null, 200, 75, 2.5, 12, 2, 0),
  (null, 'Paneer', 'g', null, 100, 265, 18.3, 1.2, 20.8, 0),
  (null, 'Paneer, low fat', 'g', null, 100, 170, 20, 4, 8, 0),
  (null, 'Paneer butter masala', 'g', null, 150, 200, 7.5, 9, 15.5, 1.5),
  (null, 'Palak paneer', 'g', null, 150, 150, 7, 6, 11, 2.5),
  (null, 'Cheese slice', 'piece', 'slice', 1, 62, 3.6, 1.2, 4.8, 0),
  (null, 'Ghee', 'g', null, 5, 900, 0, 0, 100, 0),
  (null, 'Butter', 'g', null, 10, 717, 0.9, 0.1, 81, 0),
  (null, 'Tea with milk and sugar', 'piece', 'cup', 1, 60, 1.5, 9, 1.8, 0),
  (null, 'Coffee with milk and sugar', 'piece', 'cup', 1, 70, 1.8, 10, 2, 0),
  (null, 'Black coffee / black tea', 'piece', 'cup', 1, 2, 0.3, 0, 0, 0),

  -- Chicken, meat and fish
  (null, 'Chicken breast (cooked)', 'g', null, 150, 165, 31, 0, 3.6, 0),
  (null, 'Chicken breast (raw)', 'g', null, 150, 120, 22.5, 0, 2.6, 0),
  (null, 'Chicken thigh (cooked)', 'g', null, 150, 209, 26, 0, 10.9, 0),
  (null, 'Chicken curry', 'g', null, 150, 145, 13, 4, 8.5, 1),
  (null, 'Chicken fry', 'g', null, 100, 240, 20, 8, 14.5, 0.5),
  (null, 'Tandoori chicken', 'g', null, 150, 165, 25, 3, 6, 0.5),
  (null, 'Al faham / grilled chicken', 'g', null, 200, 190, 25, 2, 9, 0.3),
  (null, 'Mutton curry', 'g', null, 150, 185, 15, 4, 12, 1),
  (null, 'Beef curry', 'g', null, 150, 200, 18, 5, 12, 1),
  (null, 'Beef fry (ularthiyathu)', 'g', null, 100, 260, 22, 5, 17, 1.5),
  (null, 'Fish curry', 'g', null, 150, 120, 12, 4, 6.5, 0.8),
  (null, 'Fish fry (sardine / mackerel)', 'g', null, 100, 220, 21, 5, 13, 0.5),
  (null, 'Fish, grilled (seer / pomfret)', 'g', null, 150, 140, 24, 0, 4.5, 0),
  (null, 'Tuna (canned in water)', 'g', null, 100, 116, 25.5, 0, 0.8, 0),
  (null, 'Prawns (cooked)', 'g', null, 100, 99, 24, 0.2, 0.3, 0),
  (null, 'Prawn roast', 'g', null, 150, 140, 14, 5, 7, 1),

  -- Vegetables and sides
  (null, 'Mixed vegetable curry', 'g', null, 150, 90, 2.5, 9, 5, 3),
  (null, 'Thoran', 'g', null, 100, 95, 2.5, 8, 6, 3.5),
  (null, 'Avial', 'g', null, 150, 110, 2.5, 8, 7.5, 3),
  (null, 'Aloo sabzi', 'g', null, 150, 120, 2, 15, 6, 2),
  (null, 'Salad (cucumber, tomato, onion)', 'g', null, 150, 20, 0.8, 4, 0.1, 1.2),
  (null, 'Broccoli (boiled)', 'g', null, 100, 35, 2.4, 7.2, 0.4, 3.3),
  (null, 'Cucumber', 'g', null, 100, 15, 0.7, 3.6, 0.1, 0.5),
  (null, 'Tomato', 'g', null, 100, 18, 0.9, 3.9, 0.2, 1.2),
  (null, 'Carrot', 'g', null, 100, 41, 0.9, 9.6, 0.2, 2.8),
  (null, 'Spinach (cooked)', 'g', null, 100, 23, 3, 3.8, 0.3, 2.4),
  (null, 'Mushroom (cooked)', 'g', null, 100, 28, 2.2, 5.3, 0.5, 2.2),
  (null, 'Sweet corn (boiled)', 'g', null, 100, 96, 3.4, 21, 1.5, 2.4),
  (null, 'Green peas (boiled)', 'g', null, 100, 84, 5.4, 15.6, 0.2, 5.5),
  (null, 'Coconut chutney', 'g', null, 30, 170, 2, 7, 15, 4),
  (null, 'Pickle (in oil)', 'g', null, 10, 180, 1, 7, 16, 2),

  -- Fruit
  (null, 'Banana', 'piece', 'banana', 1, 105, 1.3, 27, 0.4, 3.1),
  (null, 'Nendran banana', 'piece', 'banana', 1, 175, 1.8, 42, 0.4, 3),
  (null, 'Small banana (poovan / robusta)', 'piece', 'banana', 2, 70, 0.9, 18, 0.2, 1.8),
  (null, 'Apple', 'piece', 'apple', 1, 95, 0.5, 25, 0.3, 4.4),
  (null, 'Orange', 'piece', 'orange', 1, 62, 1.2, 15.4, 0.2, 3.1),
  (null, 'Guava', 'piece', 'guava', 1, 68, 2.6, 14, 1, 5.4),
  (null, 'Papaya', 'g', null, 150, 43, 0.5, 10.8, 0.3, 1.7),
  (null, 'Mango', 'g', null, 150, 60, 0.8, 15, 0.4, 1.6),
  (null, 'Watermelon', 'g', null, 200, 30, 0.6, 7.6, 0.2, 0.4),
  (null, 'Pineapple', 'g', null, 150, 50, 0.5, 13, 0.1, 1.4),
  (null, 'Grapes', 'g', null, 100, 69, 0.7, 18, 0.2, 0.9),
  (null, 'Pomegranate', 'g', null, 100, 83, 1.7, 18.7, 1.2, 4),
  (null, 'Jackfruit (ripe)', 'g', null, 100, 95, 1.7, 23, 0.6, 1.5),
  (null, 'Sapota / chikoo', 'g', null, 100, 83, 0.4, 20, 1.1, 5.3),
  (null, 'Dates', 'piece', 'date', 3, 20, 0.2, 5.3, 0, 0.6),
  (null, 'Raisins', 'g', null, 20, 299, 3.1, 79, 0.5, 3.7),
  (null, 'Coconut (fresh, grated)', 'g', null, 20, 354, 3.3, 15, 33.5, 9),
  (null, 'Tender coconut water', 'ml', null, 250, 19, 0.7, 3.7, 0.2, 1.1),

  -- Supplements and gym food
  (null, 'Whey protein', 'piece', 'scoop', 1, 120, 24, 3, 1.5, 0),
  (null, 'Whey isolate', 'piece', 'scoop', 1, 110, 25, 1, 0.5, 0),
  (null, 'Mass gainer', 'piece', 'scoop', 1, 280, 15, 52, 1.5, 1),
  (null, 'Protein bar', 'piece', 'bar', 1, 200, 20, 20, 7, 3),
  (null, 'Honey', 'g', null, 15, 304, 0.3, 82, 0, 0.2),
  (null, 'Sugar', 'g', null, 5, 387, 0, 100, 0, 0),
  (null, 'Jaggery', 'g', null, 10, 383, 0.4, 98, 0.1, 0),
  (null, 'Cooking oil', 'g', null, 10, 884, 0, 0, 100, 0),
  (null, 'Coconut oil', 'g', null, 10, 892, 0, 0, 99, 0),
  (null, 'Dark chocolate', 'g', null, 20, 546, 4.9, 61, 31, 7),

  -- Snacks, sweets and eating out
  (null, 'Banana chips', 'g', null, 30, 530, 2.3, 58, 33, 4),
  (null, 'Pazham pori', 'piece', 'piece', 1, 200, 2.5, 32, 7.5, 2),
  (null, 'Unniyappam', 'piece', 'unniyappam', 3, 90, 1, 14, 3.5, 0.7),
  (null, 'Parippu vada', 'piece', 'vada', 2, 130, 4.5, 11, 7.5, 2.5),
  (null, 'Medu vada / uzhunnu vada', 'piece', 'vada', 2, 130, 4.2, 12, 7.3, 2),
  (null, 'Samosa', 'piece', 'samosa', 1, 260, 4, 30, 14, 2.5),
  (null, 'Bajji / pakora', 'piece', 'piece', 3, 70, 1.5, 7, 4, 0.8),
  (null, 'Marie biscuit', 'piece', 'biscuit', 4, 22, 0.4, 3.9, 0.6, 0.1),
  (null, 'Digestive biscuit', 'piece', 'biscuit', 2, 70, 1, 9.5, 3, 0.5),
  (null, 'Potato chips', 'g', null, 30, 536, 7, 53, 35, 4.4),
  (null, 'Popcorn (plain)', 'g', null, 30, 387, 13, 78, 4.5, 15),
  (null, 'Gulab jamun', 'piece', 'gulab jamun', 2, 150, 2, 20, 7, 0.2),
  (null, 'Laddu', 'piece', 'laddu', 1, 180, 3, 22, 9, 1),
  (null, 'Payasam', 'g', null, 150, 170, 4, 26, 5.5, 0.4),
  (null, 'Ice cream', 'g', null, 100, 207, 3.5, 24, 11, 0.7),
  (null, 'Chicken shawarma roll', 'piece', 'roll', 1, 480, 25, 45, 22, 3),
  (null, 'Chicken burger', 'piece', 'burger', 1, 400, 20, 38, 18, 2),
  (null, 'Pizza', 'piece', 'slice', 2, 285, 12, 36, 10.4, 2.5),
  (null, 'French fries', 'g', null, 100, 312, 3.4, 41, 15, 3.8),
  (null, 'Chicken momos', 'piece', 'momo', 6, 35, 2, 4, 1.2, 0.2),
  (null, 'Soft drink', 'ml', null, 300, 42, 0, 10.6, 0, 0),
  (null, 'Fruit juice', 'ml', null, 200, 45, 0.5, 11, 0.1, 0.2);
