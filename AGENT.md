# Agent Session Guide

Start every session by reviewing:
- [AI Guidelines](./AI_GUIDELINES.md)
- [AI Context](./docs/AI_CONTEXT.md)
- [Project TODO](./TODO.md)
- [Architecture Overview](./docs/architecture/README.md)
- [API Contracts](./docs/api/README.md)
- [Domain Glossary](./docs/glossary/README.md)
- [ADRs Index](./docs/adr/README.md)

## Working Rules
- Follow TDD for feature work and bug fixes.
- Keep commits atomic and use Conventional Commits.
- Create/update ADRs for significant technical decisions.
- Keep diagrams and contracts up to date when behavior changes.
- Never execute generated Pokemon behavior with raw `eval`.

## V1 Product Scope (Approved Baseline Proposal)
- Single-player 1v1 battle loop inspired by FireRed.
- 24 built-in Pokemon in initial library (fan-favorite set).
- User-generated Pokemon pipeline: prompt -> stats/abilities plan -> image generation -> sprite processing -> persistence.
- Email/password auth via Supabase.
- Dynamic Pokemon roster for team selection from database.
- AI opponent for single-player matches.
- Static 64x64 front/back sprites for v1 (no animation requirement).
