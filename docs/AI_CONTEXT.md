# AI Context

## Project Overview
PokeForge is a web application where users battle Pokemon in a FireRed-inspired single-battle format and can generate brand new Pokemon from natural-language prompts.

Core value proposition:
- Make custom Pokemon creation fast, fun, and replayable.
- Keep generated Pokemon mechanically valid and reasonably balanced.
- Let users immediately use generated Pokemon in battles.

## Current State
- Project planning artifacts established.
- Monorepo scaffolded with `apps/web` and `packages/battle-engine`.
- Next.js TypeScript app bootstrapped with auth pages, protected battle route, API placeholders, and Docker setup.
- Supabase/OpenAI/Codex integrations are placeholder-configured via environment variables.
- Milestone 2 battle core implemented: turn engine, simplified type/status system, opponent AI heuristic, and interactive battle UI/event log.
- Milestone 3 pokemon library implemented: 24 built-in seeded catalog, Supabase-ready repository with local fallback, dynamic library/battle roster loading, sprite path integration, and paginated/filterable `/api/pokemon`.
- Milestone 4 generator pipeline implemented: authenticated prompt intake UI, Codex/OpenAI API orchestration, rule-based validation gate, generated pokemon persistence (including behavior DSL, moves, and sprites), and dynamic library/battle inclusion via shared repository.
- Milestone 5 hardening implemented: request rate limiting for mutate endpoints, prompt safety filter, structured JSON logging, expanded integration tests for generator and battle startup, and release/demo runbooks.
- Supabase setup now includes explicit `schema.sql`, `seed.sql`, and `security.sql` (RLS policies + storage bucket/policies) for consistent environment bootstrap.
- Current technical gap: server-side deterministic conversion to exact 64x64 binary sprites is pending due image-processing dependency install limitations in this environment.
- V1 scope confirmed by user, including static sprite requirement and env placeholder setup.

## Architecture (Planned)
- Frontend: Next.js (App Router), TypeScript, React.
- Backend/API: Next.js route handlers + service layer.
- Database/Auth/Storage: Supabase (Postgres + Auth + Storage).
- AI integration:
  - Codex SDK for structured generation of Pokemon specs and behavior scripts.
  - OpenAI image generation API for sprite source images.
- Runtime behavior safety: declarative behavior DSL interpreted by battle engine (no raw `eval`).

## Conventions
- TDD first for domain logic.
- Conventional Commits required.
- ADR for major architecture and security decisions.
- Strict TypeScript and explicit interfaces for all domain contracts.

## Tech Stack
- TypeScript
- Next.js
- Supabase
- Vitest (unit/integration) and Playwright (e2e smoke)
- Docker / docker-compose

## Domain Concepts
- Pokemon Template: Built-in Pokemon shipped with app.
- Generated Pokemon: User-created Pokemon persisted in DB.
- Behavior Script: Safe, declarative instruction set interpreted at runtime.
- Battle Session: Persisted/ephemeral record of an active or completed match.

## Important Decisions
- ADR-0001: Next.js + Supabase baseline stack.
- ADR-0002: Replace `eval` with constrained behavior DSL interpreter.
- ADR-0003: Rule-based balance validator in v1.
- 24 built-in Pokemon seeded initially; user will provide sprite files named `{pokemon}_front.png` and `{pokemon}_back.png`.
