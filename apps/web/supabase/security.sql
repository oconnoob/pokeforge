-- Storage bucket for pokemon sprites
insert into storage.buckets (id, name, public)
values ('sprites', 'sprites', false)
on conflict (id) do update set public = excluded.public;

-- Enable RLS
alter table public.pokemon enable row level security;
alter table public.pokemon_sprites enable row level security;
alter table public.moves enable row level security;
alter table public.pokemon_moves enable row level security;

-- Pokemon policies
DROP POLICY IF EXISTS "pokemon_select_visible" ON public.pokemon;
create policy "pokemon_select_visible"
on public.pokemon
for select
to authenticated
using (
  source_type = 'builtin'
  or owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "pokemon_insert_own_generated" ON public.pokemon;
create policy "pokemon_insert_own_generated"
on public.pokemon
for insert
to authenticated
with check (
  source_type = 'generated'
  and owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "pokemon_update_own_generated" ON public.pokemon;
create policy "pokemon_update_own_generated"
on public.pokemon
for update
to authenticated
using (owner_user_id = auth.uid() and source_type = 'generated')
with check (owner_user_id = auth.uid() and source_type = 'generated');

DROP POLICY IF EXISTS "pokemon_delete_own_generated" ON public.pokemon;
create policy "pokemon_delete_own_generated"
on public.pokemon
for delete
to authenticated
using (owner_user_id = auth.uid() and source_type = 'generated');

-- Move metadata is readable by authenticated users
DROP POLICY IF EXISTS "moves_select_all" ON public.moves;
create policy "moves_select_all"
on public.moves
for select
to authenticated
using (true);

-- Pokemon moves mapping readable if pokemon visible
DROP POLICY IF EXISTS "pokemon_moves_select_visible" ON public.pokemon_moves;
create policy "pokemon_moves_select_visible"
on public.pokemon_moves
for select
to authenticated
using (
  exists (
    select 1
    from public.pokemon p
    where p.id = pokemon_moves.pokemon_id
      and (p.source_type = 'builtin' or p.owner_user_id = auth.uid())
  )
);

-- Pokemon sprites readable if pokemon visible
DROP POLICY IF EXISTS "pokemon_sprites_select_visible" ON public.pokemon_sprites;
create policy "pokemon_sprites_select_visible"
on public.pokemon_sprites
for select
to authenticated
using (
  exists (
    select 1
    from public.pokemon p
    where p.id = pokemon_sprites.pokemon_id
      and (p.source_type = 'builtin' or p.owner_user_id = auth.uid())
  )
);

-- Storage object policies (bucket: sprites)
DROP POLICY IF EXISTS "sprites_public_read" ON storage.objects;
DROP POLICY IF EXISTS "sprites_owner_read" ON storage.objects;
create policy "sprites_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sprites'
  and name like ('generated/' || auth.uid()::text || '/%')
);

-- Keep writes server-side (service role) for demo safety.
