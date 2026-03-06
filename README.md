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
- Generated sprites are private in Supabase storage and served via authenticated API proxy routes.
- Generated pokemon cleanup endpoint: `DELETE /api/pokemon/:pokemonId` (owner/admin; removes associated sprites/relations).
- Suggestion intake endpoint: `POST /api/suggestions` (authenticated users; persists suggestion and can trigger GitHub automation).
- Suggestion status endpoints:
  - `GET /api/suggestions` (authenticated; returns current user’s recent suggestion jobs)
  - `POST /api/suggestions/:suggestionId/status` (webhook-secured callback from GitHub Actions)

## Suggestion Automation (Optional)

If you want user suggestions to trigger Codex-generated pull requests:

1. Set env vars:
   - `ENABLE_SUGGESTION_AUTOMATION=true`
   - `GITHUB_AUTOMATION_TOKEN=<token with repo dispatch access>`
   - `GITHUB_REPO_OWNER=<org-or-user>`
   - `GITHUB_REPO_NAME=<repo>`
   - `GITHUB_REPO_DEFAULT_BRANCH=main`
   - `SUGGESTION_STATUS_WEBHOOK_SECRET=<shared secret used by callback route>`
2. Add GitHub secret for workflow execution:
   - `CODEX_API_KEY`
   - `CODEX_MODEL` (optional)
   - `SUGGESTION_STATUS_CALLBACK_BASE_URL=<deployed app origin, e.g. https://pokeforge.vercel.app>`
   - `SUGGESTION_STATUS_WEBHOOK_SECRET=<same value as app env var>`
3. Ensure `.github/workflows/suggestion-codex-pr.yml` is enabled in your repo.
