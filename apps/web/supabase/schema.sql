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
  accuracy numeric(4,3) not null,
  max_pp integer not null default 20,
  current_pp integer not null default 20,
  priority integer not null default 0,
  behavior_version text not null default 'v1' check (behavior_version in ('v1', 'v2')),
  behavior_program jsonb null,
  behavior_validation jsonb null
);

alter table public.moves add column if not exists max_pp integer not null default 20;
alter table public.moves add column if not exists current_pp integer not null default 20;
alter table public.moves add column if not exists priority integer not null default 0;
alter table public.moves add column if not exists behavior_version text not null default 'v1';
alter table public.moves add column if not exists behavior_program jsonb null;
alter table public.moves add column if not exists behavior_validation jsonb null;

create table if not exists public.pokemon_moves (
  pokemon_id text not null references public.pokemon(id) on delete cascade,
  move_id text not null references public.moves(id) on delete cascade,
  slot_index integer not null,
  primary key (pokemon_id, move_id)
);

create table if not exists public.suggestions (
  id uuid primary key,
  owner_user_id uuid not null,
  message text not null,
  status text not null check (status in ('queued', 'running', 'pr_opened', 'failed')),
  github_pr_url text null,
  github_branch text null,
  github_run_url text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pokemon_source_type on public.pokemon(source_type);
create index if not exists idx_pokemon_name on public.pokemon(name);
create unique index if not exists uq_pokemon_sprites_side on public.pokemon_sprites(pokemon_id, view_side);
create index if not exists idx_suggestions_owner_created on public.suggestions(owner_user_id, created_at desc);
