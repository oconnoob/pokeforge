# AI Context

## Project Overview
PokeForge is a web application where users battle Pokemon in a FireRed-inspired single-battle format and can generate brand new Pokemon from natural-language prompts.

Core value proposition:
- Make custom Pokemon creation fast, fun, and replayable.
- Keep generated Pokemon mechanically valid and reasonably balanced.
- Let users immediately use generated Pokemon in battles.

## Current State
- Project planning artifacts established.
- No app code scaffold yet.
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
