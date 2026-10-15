-- Habits use the app's line icons instead of emoji: store an icon name.
alter table public.habits rename column emoji to icon;
alter table public.habits alter column icon set default 'check';
update public.habits set icon = case icon
  when '🚶' then 'footprints'
  when '💊' then 'pill'
  when '😴' then 'moon'
  when '🍊' then 'citrus'
  when '🚫' then 'ban'
  else 'check'
end;
