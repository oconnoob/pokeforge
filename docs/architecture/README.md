# Architecture Overview

- [V1 Product Spec](./v1-product-spec.md)

## System Shape
A single deployable web app (Next.js) with Supabase-managed data plane.

Major components:
1. Web UI: auth, library, generation flow, battle interface.
2. API layer: request validation, orchestration, persistence, battle commands.
3. Battle engine: deterministic combat core + effect interpreter.
4. Generation pipeline: Codex planning + validator + image generation + sprite transform.
5. Supabase: Postgres tables, storage buckets, auth users.

## Key Design Constraints
- No dynamic raw code execution from user-generated content.
- Keep battle logic deterministic/testable.
- Minimize moving pieces for a demo-friendly v1.

## V1 Non-Goals
- PvP multiplayer.
- Full Gen 3 parity.
- Complex animation system.
- Unlimited behavior expressiveness.
