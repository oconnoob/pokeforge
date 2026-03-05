# ADR-0003: Balance Validation Approach for v1

## Status
Accepted

## Context
Generated Pokemon must be "reasonable" for gameplay, but a full simulation optimizer is expensive to build for v1.

## Decision
Use rule-based validation in v1 with explicit stat/effect budgets and heuristics (effective HP, expected damage per turn windows, status impact caps).

## Consequences
- Fast implementation and transparent checks.
- Good enough for demo quality.
- May miss edge-case exploits that simulation-based methods would catch.

## Alternatives Considered
- Monte Carlo self-play balancing: more robust but deferred to post-v1.
