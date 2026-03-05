# PokeForge

FireRed-inspired Pokemon battle web app with AI-driven custom Pokemon generation.

## Monorepo Layout
- `apps/web`: Next.js application (UI + API routes)
- `packages/battle-engine`: shared deterministic battle domain logic
- `docs`: architecture, ADRs, diagrams, contracts

## Quick Start
1. Copy env template: `cp apps/web/.env.example apps/web/.env.local`
2. Fill required credentials.
3. Install deps: `npm install`
4. Apply Supabase SQL in order:
   - `apps/web/supabase/schema.sql`
   - `apps/web/supabase/seed.sql`
   - `apps/web/supabase/security.sql`
5. Run app: `npm run dev`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run test`

## Notes
- Generated Pokemon behavior is interpreted from a constrained DSL. Raw `eval` is not used.
- V1 uses static `64x64` front/back sprite files.
- Admin stat tuning endpoint: `PATCH /api/admin/pokemon/:pokemonId` (requires authenticated admin via `ADMIN_EMAILS` or `app_metadata.role=admin`).
