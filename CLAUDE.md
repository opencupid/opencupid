# CLAUDE.md

## Running the app

Start all services (frontend + backend + infrastructure):
```
pnpm dev
```

This uses Turbo to run both the frontend (Vite, port 5173) and backend (Fastify, port 3000) in parallel. Infrastructure services (Postgres, Redis, MailDev) run via Docker.

### Local URLs

| Service | URL |
|---------|-----|
| Frontend (entry point) | https://oc.dev.froggle.org:5173/home |
| Backend API | https://oc.dev.froggle.org:3000 |
| MailDev (email inbox) | http://oc.dev.froggle.org:1080/#/ |

### Login flow

The app uses magic link (OTP) authentication — no passwords.

1. Go to https://oc.dev.froggle.org:5173/auth
2. Enter email: `mookie@froggle.org`
3. Open MailDev at http://oc.dev.froggle.org:1080/#/
4. Find the login email, copy the OTP token
5. Paste the token back on the login page at `/auth/otp`

MailDev captures all transactional emails sent by the app (login tokens, notifications, etc.) regardless of recipient address.

## Project structure

Monorepo managed with pnpm workspaces and Turborepo.

```
apps/
  frontend/     Vue 3 + Bootstrap 5 + SCSS SPA
  backend/      Fastify + Prisma + WebSocket API
  ingress/      Reverse proxy / ingress config
packages/
  shared/       Shared types, validation, i18n, utilities
```

### Frontend (`apps/frontend`)

- Feature-based structure under `src/features/` (auth, browse, messaging, myprofile, onboarding, posts, settings, etc.)
- Router: `src/router/index.ts`
- State: Pinia stores within each feature
- Tests: Vitest, co-located in `__tests__` dirs

### Backend (`apps/backend`)

- Entry: `src/main.ts`
- API routes: `src/api/routes/` (user, profile, messaging, image, media, etc.)
- Database: Prisma ORM, schema at `prisma/schema.prisma`, migrations in `prisma/migrations/`
- Config schema: `src/lib/appConfig.ts` — all env vars must be registered here and in `/.env.example`
- Services: `src/services/`
- Workers/queues: `src/workers/`, `src/queues/`

### Key frontend routes

| Route | View |
|-------|------|
| `/home` | User home / dashboard |
| `/auth` | Login (email entry) |
| `/auth/otp` | OTP token entry |
| `/browse` | Browse profiles |
| `/profile/:profileId` | Public profile |
| `/me` | My profile |
| `/me/edit` | Edit profile |
| `/inbox/:conversationId?` | Messaging |
| `/matches/:profileId?` | Matches |
| `/posts` | Posts |
| `/settings` | Settings |
| `/onboarding` | Onboarding |

## Tests

Run the full CI suite (install, prisma generate, lint, test, type-check):
```
pnpm run ci:test
```

Run tests only:
```
pnpm test
```

Run with coverage:
```
pnpm run test:coverage
```

Run build and type check:
```
pnpm build
```


All new components, API routes, and services must have test files in the nearest `__tests__` directory.

## Database

Generate Prisma client after schema changes:
```
pnpm prisma:generate
```

Schema: `apps/backend/prisma/schema.prisma`

## Formatting

```
pnpm format
```

Uses Prettier (config: `prettier.config.js`).
