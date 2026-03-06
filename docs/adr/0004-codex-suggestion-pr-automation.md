# ADR-0004: Codex Suggestion-to-PR Automation

## Status

Accepted

## Context

We want authenticated users to submit product feedback from the app UI and have that feedback converted into repository changes via Codex, with a pull request created for human review.

Running Codex directly inside request/response API routes is fragile for production runtimes and risks long-running request failures. We need an async, auditable workflow that can safely access Git, run tests, and open PRs.

## Decision

Use a two-step architecture:

1. App-side suggestion intake:
- A global in-app widget submits feedback to `POST /api/suggestions`.
- The API validates, moderates, rate-limits, and persists the suggestion in Supabase.
- The API triggers GitHub `repository_dispatch` with suggestion metadata.

2. GitHub Actions Codex execution:
- A dedicated workflow listens to `repository_dispatch` event `codex_suggestion`.
- The workflow creates a branch, runs a Codex task script against the repo, and opens a PR.
- The PR body includes the original user suggestion and metadata for traceability.
- The workflow calls back to `POST /api/suggestions/:suggestionId/status` with a shared secret to persist `pr_opened`/`failed` status and URLs.

## Consequences

Benefits:
- Keeps web requests short and reliable.
- Runs Codex where Git and PR permissions naturally exist.
- Produces reviewable PR artifacts instead of direct production mutations.
- Supports future hardening (approvals, labels, additional checks).

Tradeoffs:
- Requires GitHub automation setup (secrets and repo permissions).
- Callback endpoint introduces another secret to rotate and manage.
- More moving parts than direct local execution.

## Alternatives Considered

1. Run Codex in API route directly:
- Rejected due to runtime constraints, long-running request risk, and lower reliability in hosted serverless environments.

2. Manual triage only (no automation):
- Rejected because it does not satisfy the desired suggestion-to-PR loop.

3. Direct mutation without PR:
- Rejected for safety and auditability reasons.
