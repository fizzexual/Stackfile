# Architecture

Stackfile is a **modular monolith**: one deployable Next.js service, internally
split into domain modules. This keeps self-hosting trivial (one container +
Postgres + Redis) while preserving clean seams for future growth.

## High-level

```
┌───────────────────────────────────────────────┐
│                 Next.js (Node)                 │
│                                                │
│   UI (React/Tailwind)   API route handlers     │
│            │                    │              │
│            ▼                    ▼              │
│   ┌─────────────────────────────────────┐     │
│   │  Domain modules                     │     │
│   │  auth · files · sharing · admin     │     │
│   └─────────────────────────────────────┘     │
│         │              │            │          │
│         ▼              ▼            ▼          │
│   ┌──────────┐  ┌────────────┐ ┌──────────┐   │
│   │ Drizzle  │  │  Storage   │ │  Redis   │   │
│   │ (Postgres)│  │ Provider  │ │ (jobs)   │   │
│   └──────────┘  └────────────┘ └──────────┘   │
└───────────────────────────────────────────────┘
                       │
                       ▼
             Server disk / object store
```

## Key decisions

### Why a modular monolith (not micro-services)?
The primary use case is **self-hosting**. A single image that boots next to
Postgres and Redis is far easier to run than a fleet of services. Internal
module boundaries (`src/lib/*`, route groups) give us most of the benefits of
separation without the operational cost.

### Why Next.js full-stack (not a separate API server)?
One language, one build, one deploy. Route handlers stream large uploads/downloads
just fine on a long-running Node server. We run a small **custom Node server**
(`server.js`) that also handles WebDAV (whose non-standard HTTP methods a Next
route handler can't receive), so the app is started with `node server.js`. If an
independent API is ever needed, the domain logic already lives in
framework-agnostic modules under `src/lib`.

### Storage is pluggable
All blob I/O goes through the [`StorageProvider`](src/lib/storage/types.ts)
interface. The default `LocalDiskStorage` writes to a configurable path
(`STORAGE_LOCAL_PATH`) with path-traversal protection. An S3-compatible driver
can be added later without touching call sites.

### Auth via better-auth
`better-auth` gives us email/password, 2FA (TOTP), OAuth, passkeys (WebAuthn),
and organizations from one library, backed by our Drizzle tables
(`user`, `session`, `account`, `verification`).

### Data model
- **Auth:** `user`, `session`, `account`, `verification`
- **Storage:** `folder` (self-referencing tree), `file`, `file_version`
- **Organization:** `tag`, `file_tag`, `share`, `activity_log`
- Soft-delete via `deleted_at` on `file`/`folder` powers Trash & restore.
- `organization_id` columns are present now for multi-tenancy (P4).

Schema lives in [`src/lib/db/schema.ts`](src/lib/db/schema.ts); migrations are
generated with `pnpm db:generate` into `drizzle/`.

## Request lifecycle (uploads, P2 preview)
1. Client drags files → chunked upload to a route handler.
2. Handler streams chunks to the `StorageProvider` under a generated key.
3. On completion, a `file` row is written (size, mime, checksum, storage key).
4. A background job (Redis/BullMQ) generates a thumbnail.

## Environments
Configuration is validated once at boot via [`src/lib/env.ts`](src/lib/env.ts)
(Zod). Invalid config fails fast; Docker builds skip validation with
`SKIP_ENV_VALIDATION=1`.
