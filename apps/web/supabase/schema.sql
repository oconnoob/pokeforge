create table if not exists public.pokemon (
  id text primary key,
  owner_user_id uuid null,
  name text not null,
  source_type text not null check (source_type in ('builtin', 'generated')),
  primary_type text not null,
  secondary_type text null,
  hp integer not null,
  attack integer not null,
  defense integer not null,
  speed integer not null,
  behavior_script jsonb null,
  balance_report jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.pokemon_sprites (
  id bigserial primary key,
  pokemon_id text not null references public.pokemon(id) on delete cascade,
  view_side text not null check (view_side in ('front', 'back')),
  storage_path text not null,
  width integer not null default 64,
  height integer not null default 64
);

create table if not exists public.moves (
  id text primary key,
  name text not null,
  element_type text not null,
  power integer not null,
  accuracy numeric(4,3) not null
);

create table if not exists public.pokemon_moves (
  pokemon_id text not null references public.pokemon(id) on delete cascade,
  move_id text not null references public.moves(id) on delete cascade,
  slot_index integer not null,
  primary key (pokemon_id, move_id)
);

create index if not exists idx_pokemon_source_type on public.pokemon(source_type);
create index if not exists idx_pokemon_name on public.pokemon(name);
create unique index if not exists uq_pokemon_sprites_side on public.pokemon_sprites(pokemon_id, view_side);
