# ADR-0002: Safe Runtime for Generated Pokemon Behavior

## Status
Accepted

## Context
The product requires AI-generated, novel Pokemon behaviors. Raw `eval` of generated code introduces high risk (code injection, escape vectors, nondeterminism).

## Decision
Represent generated behavior as constrained JSON DSL interpreted by battle engine hooks.

## Consequences
- Major security improvement over arbitrary code execution.
- Easier deterministic testing and replay.
- Slightly reduced expressiveness compared to free-form generated code.

## Alternatives Considered
- Raw `eval`: rejected due to severe execution risk.
- Node `vm` sandbox: better than eval but still larger attack surface and operational complexity for v1.
