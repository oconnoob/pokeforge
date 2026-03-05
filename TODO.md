# TODO

## Milestone 0 - Planning and Foundation
- [x] Create agent/session context docs and architecture baseline
- [x] Define v1 scope and non-goals
- [x] Define initial API contracts and domain glossary
- [x] Add initial ADRs for architecture and safety decisions
- [x] Confirm/adjust v1 scope with user approval

## Milestone 1 - App Bootstrap
- [x] Initialize monorepo/workspace structure
- [x] Scaffold Next.js app (TypeScript)
- [x] Configure Supabase project integration
- [x] Add auth pages and protected routes
- [x] Set up test tooling (unit + integration + e2e smoke)
- [x] Set up Docker and docker-compose dev workflow

## Milestone 2 - Battle Engine (Core)
- [x] Implement core turn engine (single battle 1v1)
- [x] Implement type effectiveness and status effects (simplified)
- [x] Implement opponent AI (heuristic move selection)
- [x] Build battle UI and event log
- [x] Add battle engine unit test suite

## Milestone 3 - Pokemon Library
- [ ] Seed 24 built-in Pokemon and move sets
- [ ] Build Pokemon library and selection UI
- [ ] Add sprite storage/loading integration for built-ins
- [ ] Add roster query API with pagination/filtering

## Milestone 4 - Pokemon Generator Pipeline
- [ ] Prompt intake UI + validation
- [ ] Codex-driven design pipeline (stats/moves/ability spec)
- [ ] Balance validator (rule-based in v1)
- [ ] OpenAI image generation + sprite conversion to 64x64 front/back
- [ ] Persist generated Pokemon and sprites in Supabase
- [ ] Generated behavior runtime through safe DSL interpreter

## Milestone 5 - Hardening
- [ ] Security review and abuse controls (rate limits, content filtering)
- [ ] Add observability/logging for generation pipeline
- [ ] Add integration tests for generator and battle startup
- [ ] Build demo script and release checklist

## Future (Post-v1)
- [ ] Simulation-based balance validation (Monte Carlo self-play)
- [ ] PvP battles
- [ ] Expanded mechanics closer to Gen 3
- [ ] Animated sprites and richer move effects
