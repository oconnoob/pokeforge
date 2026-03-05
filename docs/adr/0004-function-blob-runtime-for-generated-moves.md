# ADR-0004: Function Blob Runtime for Generated Moves

## Status
Accepted

## Context
The product goal is to let Codex define novel per-move behavior for generated Pokemon, not only select from a fixed JSON primitive set.

The current v2 behavior program (DSL) is safer but limits expressiveness. We need a path where each generated move can include a custom function body while still applying security checks and deterministic battle constraints.

## Decision
Store generated move function bodies as data in the `moves` table and execute them through a constrained runtime adapter in the battle engine.

Key points:
- Each move can include a `behavior_function` string (function body blob).
- Create pipeline runs a dedicated Codex security review pass on all generated function blobs before persistence.
- Local static guards reject dangerous patterns (imports, eval, Function constructor, obvious loop constructs, globals/process access).
- Runtime executes function bodies with a narrow context and helper API; returned effects are bounded and clamped before application.
- Runtime errors never crash battle resolution; engine logs and falls back to base attack behavior.
- Feature flags gate generation and execution rollout.

## Consequences
- Achieves user goal of generated custom behavior via function-body blobs.
- Increases implementation complexity and security surface area compared with DSL-only runtime.
- Requires stronger observability and testing around runtime failures and review false positives.
- Keeps deterministic match progression by clamping and validating function outputs.

## Alternatives Considered
- Expand DSL-only approach: safer, but not aligned with explicit function-body requirement.
- Raw `eval` with no review: rejected due to unacceptable abuse/risk profile.
- Full isolated worker/microservice sandbox: best long-term option, deferred for demo velocity.
