<div align="center">

# 📦 Stackfile

### Self-hosted file storage, reimagined.

Upload, organize, and share your files from **your own server** — with a modern,
original interface. Think "Nextcloud Files," rebuilt from scratch on a 2026 stack.

![status](https://img.shields.io/badge/status-in%20development-f59e0b)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-22c55e)

</div>

---

## What is Stackfile?

Stackfile is a **self-hostable file storage & sharing platform**. It's not an
office suite — it does one thing and does it deeply: **store your files on your
own disk, organize them, and share them** — with versioning, trash, tags,
search, granular sharing, multi-user teams, and an admin panel.

It's built as a **modular monolith** so it runs as a single container next to
Postgres + Redis, yet stays cleanly separated internally (auth · storage ·
files · sharing · admin) so it can grow.

## ✨ Features

| Area | Status |
| --- | --- |
| Drag-and-drop upload (chunked / resumable) & download | 🔜 P2 |
| Folders, move/rename, browse | 🔜 P2 |
| Trash & restore (soft delete) | 🔜 P2 |
| Thumbnails & previews | 🔜 P2 |
| Share links (password + expiry), user-to-user shares | 🔜 P3 |
| Favorites, tags, file versioning, search | 🔜 P3 |
| Multi-tenant orgs/teams, roles, quotas, admin panel | 🔜 P4 |
| Email/password auth, 2FA, OAuth, passkeys | 🔜 P1 / P5 |
| WebDAV, realtime notifications, full-text search | 🔜 P6 |
| Pluggable storage backend (local disk today, S3 later) | ✅ |

## 🧱 Tech stack

- **Next.js 16** (App Router, React 19, full-stack) — ships as one self-hostable service
- **TypeScript 6** end-to-end
- **Tailwind CSS v4** + shadcn/ui — original design system
- **PostgreSQL 17** + **Drizzle ORM** — type-safe schema & migrations
- **better-auth** — email/password, 2FA, OAuth, passkeys, organizations
- **Redis** + BullMQ — background jobs (thumbnails, indexing)
- **Docker Compose** — one-command self-hosting

## 🚀 Quick start (local dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env        # then edit as needed

# 3. Start Postgres + Redis
docker compose up -d postgres redis

# 4. Run database migrations
pnpm db:migrate

# 5. Start the dev server
pnpm dev                    # → http://localhost:3000
```

## 🐳 Self-hosting (full stack in Docker)

```bash
cp .env.example .env        # set a strong BETTER_AUTH_SECRET
docker compose up -d --build
```

This starts Postgres, Redis, runs migrations, and serves Stackfile on
**http://localhost:3000**. Uploaded files live in the `storagedata` volume.

## ⚙️ Configuration

All config is via environment variables (see [`.env.example`](.env.example)):

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `BETTER_AUTH_SECRET` | Auth signing secret (`openssl rand -base64 32`) | — |
| `STORAGE_DRIVER` | Storage backend (`local`) | `local` |
| `STORAGE_LOCAL_PATH` | **Which disk/folder files live in** | `./storage-data` |
| `STORAGE_MAX_UPLOAD_BYTES` | Max single-upload size | `5 GiB` |

> **Choosing where files are stored:** point `STORAGE_LOCAL_PATH` at any disk or
> folder on the server (e.g. `D:/StackfileData` or `/mnt/bigdisk/stackfile`).

## 🗂️ Project structure

```
src/
  app/                 # Next.js routes (UI + API route handlers)
  lib/
    env.ts             # typed, validated environment
    db/                # Drizzle schema + connection
    storage/           # pluggable StorageProvider (local disk today)
drizzle/               # generated SQL migrations
docker-compose.yml     # postgres + redis + migrate + app
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and key decisions.

## 🗺️ Roadmap

- **P0 — Foundation** ✅ scaffold, config, storage abstraction, DB schema, Docker, CI
- **P1 — Auth** email/password + sessions
- **P2 — Files MVP** ⭐ upload/download/folders/trash/thumbnails
- **P3 — Sharing** links, permissions, favorites, tags, versioning, search
- **P4 — Teams & Admin** orgs, roles, quotas, admin panel
- **P5 — Advanced auth** 2FA, OAuth, passkeys
- **P6 — Flex** WebDAV, realtime, full-text search, audit logs

## 📄 License

[MIT](LICENSE) © Fizzexual
