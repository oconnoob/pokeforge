# ADR-0001: Baseline Stack - Next.js + Supabase + TypeScript

## Status
Accepted

## Context
We need to deliver a demo-ready web app quickly with auth, persistence, API endpoints, and a modern UI while minimizing infrastructure overhead.

## Decision
Use Next.js (TypeScript) as the web and API runtime, and Supabase for Postgres/Auth/Storage.

## Consequences
- Faster delivery with fewer services to operate.
- Unified language across frontend and backend.
- Vendor coupling to Supabase features in v1.

## Alternatives Considered
- Separate frontend + Node API + standalone Postgres: more flexible but slower to bootstrap.
- Firebase stack: good velocity but less aligned with relational model for battle data.
