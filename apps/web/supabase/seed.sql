delete from public.pokemon
where id = 'lucario'
  and source_type = 'builtin';

insert into public.pokemon (id, name, source_type, primary_type, hp, attack, defense, speed)
values
  ('pikachu', 'Pikachu', 'builtin', 'electric', 92, 78, 58, 112),
  ('charizard', 'Charizard', 'builtin', 'fire', 110, 92, 78, 100),
  ('blastoise', 'Blastoise', 'builtin', 'water', 118, 84, 100, 80),
  ('venusaur', 'Venusaur', 'builtin', 'grass', 116, 86, 88, 82),
  ('gengar', 'Gengar', 'builtin', 'psychic', 98, 84, 70, 106),
  ('alakazam', 'Alakazam', 'builtin', 'psychic', 94, 74, 60, 114),
  ('dragonite', 'Dragonite', 'builtin', 'normal', 128, 102, 92, 86),
  ('snorlax', 'Snorlax', 'builtin', 'normal', 140, 96, 86, 38),
  ('lapras', 'Lapras', 'builtin', 'water', 130, 82, 86, 62),
  ('arcanine', 'Arcanine', 'builtin', 'fire', 116, 98, 80, 96),
  ('gyarados', 'Gyarados', 'builtin', 'water', 122, 100, 82, 90),
  ('machamp', 'Machamp', 'builtin', 'fighting', 124, 102, 86, 62),
  ('jolteon', 'Jolteon', 'builtin', 'electric', 94, 74, 62, 120),
  ('vaporeon', 'Vaporeon', 'builtin', 'water', 132, 74, 72, 70),
  ('flareon', 'Flareon', 'builtin', 'fire', 108, 108, 72, 72),
  ('gardevoir', 'Gardevoir', 'builtin', 'psychic', 108, 76, 76, 86),
  ('scizor', 'Scizor', 'builtin', 'rock', 104, 100, 94, 74),
  ('tyranitar', 'Tyranitar', 'builtin', 'rock', 128, 106, 96, 72),
  ('salamence', 'Salamence', 'builtin', 'normal', 124, 104, 84, 100),
  ('metagross', 'Metagross', 'builtin', 'psychic', 124, 100, 98, 78),
  ('mewtwo', 'Mewtwo', 'builtin', 'psychic', 124, 98, 82, 118),
  ('eevee', 'Eevee', 'builtin', 'normal', 88, 60, 58, 68),
  ('deoxys', 'Deoxys', 'builtin', 'psychic', 104, 100, 70, 120)
on conflict (id) do nothing;

insert into public.pokemon_sprites (pokemon_id, view_side, storage_path, width, height)
select id, 'front', '/sprites/' || lower(name) || '_front.png', 64, 64
from public.pokemon
where source_type = 'builtin'
on conflict (pokemon_id, view_side) do nothing;

insert into public.pokemon_sprites (pokemon_id, view_side, storage_path, width, height)
select id, 'back', '/sprites/' || lower(name) || '_back.png', 64, 64
from public.pokemon
where source_type = 'builtin'
on conflict (pokemon_id, view_side) do nothing;
