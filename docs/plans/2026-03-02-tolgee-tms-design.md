# Tolgee TMS Integration Design

**Date:** 2026-03-02
**Scope:** `apps/frontend` only
**Approach:** Tolgee as translation management system (TMS) — no frontend code changes

## Overview

Add a self-hosted Tolgee instance to the local dev environment as a translation management UI. Translators use the Tolgee web interface to manage strings; developers push/pull JSON files via the Tolgee CLI. Zero changes to the frontend app or vue-i18n setup.

## Components

### 1. Docker Compose services

Add to `docker-compose.yml`:

- `tolgee-db` — dedicated Postgres container for Tolgee (separate from the app DB to avoid schema conflicts)
- `tolgee` — Tolgee server, web UI on `http://localhost:8085`

Dev-only services, not present in `docker-compose.production.yml`.

### 2. Environment config

**`.env.development.local`** (committed — no secrets, localhost-only values):

```
TOLGEE_API_KEY=tgpak_...   # generated from local Tolgee UI after first login
```

Vite automatically loads this file in dev. It does not appear in `.env.example` (production template).

### 3. Tolgee CLI config

**`.tolgeerc.yml`** at repo root (committed):

```yaml
apiUrl: http://localhost:8085
projectId: 1
files:
  - path: packages/shared/i18n/{language}.json
    language: '{language}'
  - path: packages/shared/i18n/api/{language}.json
    language: '{language}'
    namespace: api
```

`TOLGEE_API_KEY` is read from the environment (`.env.development.local`).

### 4. Package scripts

Root `package.json` gains two scripts:

```json
"tolgee:push": "tolgee push",
"tolgee:pull": "tolgee pull"
```

`@tolgee/cli` added as a root devDependency.

### 5. Translation namespaces

| File | Tolgee namespace |
|------|-----------------|
| `packages/shared/i18n/en.json` | default |
| `packages/shared/i18n/hu.json` | default |
| `packages/shared/i18n/api/en.json` | api |
| `packages/shared/i18n/api/hu.json` | api |

### 6. Documentation

`CLAUDE.md` updated with:
- Tolgee local URL (`http://localhost:8085`)
- First-time setup steps (login, generate API key, copy to `.env.development.local`)
- `pnpm tolgee:push` / `pnpm tolgee:pull` workflow

## What does NOT change

- `apps/frontend/src/` — no changes
- `apps/backend/` — no changes
- `.env.example` — no changes (stays as production template)
- vue-i18n setup, `i18nStore`, components — untouched

## Developer workflow

1. `docker compose up` — starts Tolgee alongside existing services
2. Open `http://localhost:8085`, log in, create project, generate API key
3. Copy key to `.env.development.local`
4. `pnpm tolgee:push` — seed Tolgee with existing JSON strings
5. Translate strings in the Tolgee UI
6. `pnpm tolgee:pull` — write translated JSON back to disk
7. Commit updated JSON files
