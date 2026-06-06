# ADR 0001: Next.js SQLiteCloud Subscription Workspace

## Status

Accepted

## Context

The target GitHub repository started as an empty shell. The user asked to build 鋒兄訂閱 based on the SQLiteCloud repo, reference the Appwrite version, provide a recommended `subscription` table format, allow users to input API key and related settings, use `impeccable.style`, use `mattpocock/skills`, and use the latest Next.js.

## Decision

Use Next.js App Router with a focused product workspace:

- `app/page.tsx` is the primary interactive subscription/settings surface.
- `lib/subscription-schema.ts` owns the canonical `subscription` schema and SQL.
- API routes under `app/api/subscription` provide SQLiteCloud-oriented CRUD entry points.
- `CONTEXT.md`, `docs/agents/*`, and ADRs support mattpocock/skills-style domain and workflow context.

## Consequences

The app can run as a self-contained UI first, while still having a clear path to real SQLiteCloud persistence. Future changes should keep UI fields, schema fields, and API payloads synchronized.
