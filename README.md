<div align="center">

# 📦 Stackfile

### Self-hosted file storage, reimagined.

A modern, **dark**, self-hostable cloud drive — upload, organize, and share your
files from **your own server**. Nextcloud-inspired, rebuilt from scratch on a
2026 stack, and designed to run as a **single service** you can actually own.

![status](https://img.shields.io/badge/status-active-22c55e)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)
![better-auth](https://img.shields.io/badge/better--auth-1.6-ce47eb)
![License](https://img.shields.io/badge/license-MIT-22c55e)

[Quick start](#-quick-start) · [Self-hosting](#-self-hosting) · [Architecture](ARCHITECTURE.md) · [Roadmap](#-roadmap)

</div>

---

## ✨ Features

Everything below is **built and working today**:

### 🗄️ Files
- Drag-and-drop **upload** with live progress (streamed straight to disk)
- **Download**, **folders** (create / rename), breadcrumb navigation, list & grid views
- **Trash** — soft-delete → restore → delete-forever (with blob cleanup)
- **Favorites**, a file **details panel**, and type-aware icons
- **Search** across your files & folders by name

### 🔗 Sharing
- **Public share links** with optional **password** (scrypt-hashed) and **expiry**
- Password-gated public download pages; create / list / revoke from a file's details

### 👤 Accounts & security
- **Email + password** auth ([better-auth](https://better-auth.com)), 7-day sessions
- **Two-factor authentication** (TOTP) with QR setup + **backup codes** — login is
  challenged and the session stays locked until the code is verified
- **OAuth** (Google / GitHub) — activates automatically when credentials are set
- **Settings** page: profile, change password, 2FA, connected accounts

### 🛡️ Multi-user & admin
- The **first registered user becomes the instance admin**
- **Admin panel** — instance stats + user management (promote/demote, delete)
- **Per-user storage quotas**, enforced on upload, with a sidebar usage bar

### 📊 Audit
- **Activity log** — uploads, folder ops, shares, trash / restore / delete, favorites

## 🖼️ A look at it

Stackfile is a dark, three-pane file manager — **sidebar · file list · details** —
on a near-black `#010003` canvas with a purple → magenta → coral brand gradient.
Clone it and run locally (below) to explore; the demo seeds a few files.

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19) — full-stack, one service |
| Language | **TypeScript 6**, end to end |
| Styling | **Tailwind CSS v4**, Inter + Azeret Mono |
| Database | **PostgreSQL 17** + **Drizzle ORM** (type-safe, snake_case) |
| Auth | **better-auth** — password, 2FA (TOTP), OAuth, sessions |
| Storage | Pluggable `StorageProvider` — local disk today, S3-ready |
| Infra | **Docker Compose** (Postgres + Redis + migrate + app) + GitHub Actions CI |

Built as a **modular monolith**: one deployable service, cleanly split internally
(`auth · files · sharing · admin · activity`). See [ARCHITECTURE.md](ARCHITECTURE.md).

## 🚀 Quick start

```bash
pnpm install
cp .env.example .env                   # then set BETTER_AUTH_SECRET
docker compose up -d postgres redis    # Postgres :5544, Redis :6379
pnpm db:migrate
pnpm dev                               # → http://localhost:4000
```

> The **first account you create becomes the admin.**

## 🐳 Self-hosting

```bash
cp .env.example .env                   # set a strong BETTER_AUTH_SECRET
docker compose up -d --build           # Postgres + Redis + migrations + app
```

Serves on **http://localhost:4000**; uploaded files persist in the `storagedata` volume.

## ⚙️ Configuration

All config is via environment variables (see [`.env.example`](.env.example)):

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `BETTER_AUTH_SECRET` | Auth signing secret (`openssl rand -base64 32`) | — |
| `STORAGE_LOCAL_PATH` | **Which disk / folder files live in** | `./storage-data` |
| `STORAGE_MAX_UPLOAD_BYTES` | Max single-upload size | `5 GiB` |
| `GITHUB_CLIENT_ID` / `_SECRET` | Enable GitHub OAuth | — |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Enable Google OAuth | — |

> **Choose where files live:** point `STORAGE_LOCAL_PATH` at any disk or folder
> (`D:/StackfileData`, `/mnt/bigdisk/stackfile`, …).

## 📁 Project structure

```
src/
  app/
    (auth)/          sign in / sign up
    (app)/           files · search · activity · trash · admin · settings
    s/[token]/       public share pages
    api/             upload · download · auth · public share download
  lib/
    auth/  db/  storage/  files/  sharing/  admin/  activity/  env.ts
drizzle/             generated SQL migrations
docker-compose.yml   postgres · redis · migrate · app
```

## 🗺️ Roadmap

| Phase | What | Status |
| --- | --- | --- |
| **P0** | Foundation — scaffold, config, storage, schema, Docker, CI | ✅ |
| **P1** | Auth — email/password + sessions | ✅ |
| **P2** | Files — upload/download/folders/trash/favorites | ✅ |
| **P3** | Sharing — public links (password + expiry) | ✅ |
| **P4** | Admin — panel + per-user quotas | ✅ |
| **P5** | Advanced auth — TOTP 2FA, OAuth, settings | ✅ |
| **P6** | Search + activity log | ✅ |
| — | WebDAV, passkeys, organizations, versioning, realtime, content search | 🔜 |

## 📄 License

[MIT](LICENSE) © Fizzexual
