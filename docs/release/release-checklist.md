# Release Checklist (v1)

- [ ] Env vars configured in deployment target (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY`).
- [ ] Supabase schema applied: `apps/web/supabase/schema.sql`.
- [ ] Built-in seed applied: `apps/web/supabase/seed.sql`.
- [ ] Supabase security/bucket setup applied: `apps/web/supabase/security.sql`.
- [ ] Built-in sprite files present in `apps/web/public/sprites`.
- [ ] `npm run test` passes.
- [ ] Generate route smoke tested with authenticated user.
- [ ] Battle route smoke tested with at least 2 available pokemon.
- [ ] Rate limit and prompt safety behavior verified on `/api/pokemon/generate`.
- [ ] Demo script dry-run completed.
