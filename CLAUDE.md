# CLAUDE.md

## Running the app

Start all services (frontend apps + backend):

```bash
pnpm dev
```

This uses Turbo to run both the frontend (Vite, port 5173, 5174) and backend (Fastify, port 3000) in parallel. Infrastructure services (Postgres, Redis, MailDev) run via Docker.

### Local URLs

| Service                | URL                                    |
| ---------------------- | -------------------------------------- |
| Frontend (entry point) | <https://oc.dev.froggle.org:5173/home> |
| Backend API            | <https://oc.dev.froggle.org:3000>      |
| MailDev (email inbox)  | <http://oc.dev.froggle.org:1080/#/>    |
| Tolgee (translation UI) | <http://localhost:8085>               |

### Login flow

The app uses magic link (OTP) authentication — no passwords.

1. Go to <https://oc.dev.froggle.org:5173/auth>
2. Enter email: `mookie@froggle.org`
3. Open MailDev at <http://oc.dev.froggle.org:1080/#/>
4. Find the login email, copy the OTP token
5. Paste the token back on the login page at `/auth/otp`

MailDev captures all transactional emails sent by the app (login tokens, notifications, etc.) regardless of recipient address.

### Tolgee (translation management)

Tolgee is a self-hosted translation management UI. It starts alongside other dev services and auto-imports all strings from `packages/shared/i18n/` on first boot — no manual setup needed.

```bash
docker compose up -d tolgee   # starts tolgee + tolgee-db
# UI at http://localhost:8085  (admin / admin)
```

The API key in `.env.development.local` is pre-configured. Push/pull workflow:

```bash
pnpm tolgee:push   # upload local JSON → Tolgee (after adding new keys in code)
pnpm tolgee:pull   # download translated JSON ← Tolgee (after translating in UI)
```

Commit updated JSON files in `packages/shared/i18n/` after pulling.

## Project structure

Monorepo managed with pnpm workspaces and Turborepo.

```txt
apps/
  frontend/     Vue 3 + Bootstrap 5 + SCSS SPA
  admin/        Vue 3 + Bootstrap 5 + SCSS SPA admin GUI
  backend/      Fastify + Prisma + WebSocket API
  ingress/      Reverse proxy / ingress config
packages/
  shared/       Shared types, validation, i18n, utilities and reused UI components
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

| Route                          | View                                               |
| ------------------------------ | -------------------------------------------------- |
| `/home`                        | User home / dashboard                              |
| `/auth`                        | Login (email entry)                                |
| `/auth/otp`                    | OTP token entry                                    |
| `/browse`                      | Browse profiles (social)                           |
| `/matches`                     | Browse profiles (dating)                           |
| `/browse/profile/:profileId`   | Public profile                                     |
| `/matches/profile/:profileId?` | Public profile                                     |
| `/me`                          | My profile                                         |
| `/me/edit`                     | Edit profile                                       |
| `/inbox`                       | Conversation list                                  |
| `/inbox/:conversationId`       | Messaging                                          |
| `/posts`                       | Posts                                              |
| `/settings`                    | Settings                                           |
| `/onboarding`                  | Onboarding (only when profile `isActive` is false) |

## Tests

Whilst iterating on a task, try to minimize test runs by running the relevant test cases.

Full test suite:

```bash
pnpm test
```

Frontend tests:

```bash
pnpm --filter frontend test
```

Backend tests:

```bash
pnpm --filter backend test
```

Type-check only (vue-tsc / tsc across frontend, admin and backend, including test files):

```bash
pnpm type-check
```

Full CI suite — mirrors GitHub Actions PR checks (install, prisma generate, lint, type-check, build, tests, i18n). Run before finalizing a PR, once `pnpm test` and `pnpm lint` are green:

```bash
pnpm run ci:test
```

Run with coverage:

```bash
pnpm run test:coverage
```

- All completed work must pass full test suite
- For all new frontend components, API routes and services test files must be added in the `__tests__` subdirectory closest to the new file or existing file being modified
- Format **only files you added or modified** using `pnpm exec prettier --write <file1> <file2> ...`. Never run `pnpm format` or `prettier --write .` on the whole codebase — this creates noise in PRs with unrelated formatting changes.
- From the package root run `pnpm test`. The commit should pass all tests before you merge.
- To focus on one step, run Vitest directly: `pnpm --filter frontend exec vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## Database

Generate Prisma client after schema changes:

```bash
pnpm --filter backend prisma:generate
```

During development, use MCP to access the database.

In production, run interactive psql shell (via Docker):

```bash
pnpm --filter backend db:psql
```

Schema: `apps/backend/prisma/schema.prisma`

### Running arbitrary SQL against dev database

```bash
docker compose exec db psql -U appuser -d app -c "<SQL>"
```

### Database queries (Claude MCP)

The `postgres` MCP server provides direct SQL access to the dev database during debugging. Prefer this instead of `docker exec` / `psql` commands for faster iteration.

## Git workflow

> **HARD RULE — NO EXCEPTIONS:** You MUST NEVER commit anything to the `main` branch. Not documentation, not design files, not a single line. Every commit goes on a feature branch. If you are on `main`, stop and create a branch before touching anything.  When creating a new feature branch, **always** create off of `main`.  Always check before creating.

Always work in a feature branch and open a Github pull request once task is complete and tests succeed.

```bash
git checkout -b your-branch-name
# ... make changes, commit ...
pnpm test                              # MUST pass before push
pnpm type-check                        # MUST pass before finalizing PR
git push -u origin your-branch-name
gh pr create
```

## CI workflow

Only watch CI when **finalizing** a PR (all work done, ready for review/merge). Always start a subagent watching CI tests to finish, do not wait in foreground. Assign subagent to watch CI after every intermediate push:

```bash
gh run list --limit 1
gh run watch --exit-status    # blocks until the run finishes
```

- If the run **passes**, you're done.
- If the run **fails**, download the logs, diagnose the failure, fix the code, commit, push, and watch again (in the background):

```bash
gh run view --log-failed     # show only the failed step logs
```

Repeat until CI is green. Never leave a finalized PR with a failing CI run.

Each PR must contain **one logical change** — don't bundle unrelated fixes, features, or refactors into a single branch. If you discover something unrelated while working (e.g. a typo, a small bug, a cleanup opportunity), finish your current PR first, then open a separate one. If in doubt whether a change belongs on the current branch, ask before committing.

## Releases

### Versioning strategy

Each Docker image has its own semver version in its `apps/<service>/package.json`. Versions are managed with [Changesets](https://github.com/changesets/changesets).

- **Bugfix-only changes**: patch bump (e.g. 1.0.0 → 1.0.1)
- **New features or enhancements**: minor bump (e.g. 1.0.1 → 1.1.0)
- If the user specifies an explicit version, use that instead

### Changesets workflow

> **HARD RULE — NO EXCEPTIONS:** Every PR that changes a service **must** include a changeset file before it is merged, as part of the finalization workflow. Never finalise a PR without one.

Since `pnpm changeset` requires an interactive TTY that is unavailable in Claude Code, write the file directly instead:

```bash
# filename: .changeset/<adjective-noun-verb>.md  (three random words, kebab-case)
cat > .changeset/silver-tags-bloom.md << 'EOF'
---
'@opencupid/frontend': patch
---

Short description of the change (#issue-number)
EOF
```

Bump type guide:

- `patch` — bug fixes, non-visible improvements
- `minor` — new features or enhancements
- `major` — breaking changes

### Release process

Run these steps in order:

1. **Apply version bumps** from accumulated changesets:

   ```bash
   git checkout main && git pull
   git checkout -b chore/release
   pnpm changeset version    # bumps affected package.json versions, writes CHANGELOGs
   # Also bump root package.json version if desired
   git add . && git commit -m "chore: version packages"
   git push -u origin chore/release
   gh pr create --title "chore: release" --body "Apply changeset version bumps."
   # merge the PR
   ```

2. **Create the GitHub release** targeting `main` with release notes:

   ```bash
   gh release create vX.Y.Z --target main --title "vX.Y.Z" --notes "<release notes>"
   ```

   - Generate release notes from `git log <previous-tag>..main --oneline --no-merges`
   - Include only new features and enhancements, not bug fixes
   - Keep summaries brief
   - End with a full changelog link: `**Full Changelog**: https://github.com/opencupid/opencupid/compare/<previous-tag>...vX.Y.Z`

3. **Watch the Docker build in the background** — creating the release auto-triggers the Docker workflow. CI detects which images have new version tags and only builds those:

```bash
gh run watch --exit-status
```

## Production deployment

**HARD RULE — NO EXCEPTIONS:** You MUST NEVER commit production configuration to the repository. This includes `.env` files, TLS certificates, secrets, API keys, or any host-specific configuration. Only `.env.example` exists in the repo as a reference template. The real production `.env` lives only on the production host — always preserve existing configuration when updating it (do not remove variables).

1. **Always ask for the hostname** before deploying
2. **SSH access**: `ssh -A <hostname>` as current user (not root). The user is in the docker group so `sudo` is not needed for docker commands — only use `sudo` for system-level commands or accessing files outside `~/opencupid`
3. **Repo clone on host**: `~/opencupid` — read-only git access, used for `docker-compose.production.yml` and config
4. **Deploy on host** (via SSH — always deploy a release tag, never main):

   ```bash
   cd ~/opencupid && git fetch --tags && git checkout vX.Y.Z
   # Update per-image version vars in .env (only changed images):
   # BACKEND_VERSION=1.0.1  FRONTEND_VERSION=1.0.2  etc.
   docker compose -f docker-compose.production.yml pull backend frontend admin ingress
   docker compose -f docker-compose.production.yml up -d --no-deps frontend ingress admin
   docker compose -f docker-compose.production.yml up -d --no-deps backend
   ```

5. **Run migrations** (if schema changes were included):

```bash
docker compose -f docker-compose.production.yml exec backend npx prisma migrate deploy
```

1. **Verify**:

   ```bash
   docker compose -f docker-compose.production.yml ps
   docker compose -f docker-compose.production.yml logs --tail=50 backend
   docker compose -f docker-compose.production.yml logs --tail=50 ingress
   ```

## Formatting

Format only the files you changed — never the entire codebase:

```bash
pnpm exec prettier --write <file1> <file2> ...
```

Uses Prettier (config: `prettier.config.mjs`).

## Data integrity

When storage formats, path conventions, or data schemas change, always migrate the existing data to match the new format. Never add backwards-compatibility shims, fallback paths, or conditional logic to handle legacy data alongside new data. Fix the data, not the code.

## Debugging

When debugging any problem, after you found an issue that looks suspect, do not immediately go in and impose a fix on the symptom. Instead, take one step back, look at the bigger picture, look at commit history and try to find the root cause and fix THAT.  Use `git blame`. Never add workaround, silence errors to make an error message go away.

## Coding Guidelines

Development guidelines and best practices for this project.

- always adhere to SOLID Principles (DRY, KISS, YAGNI)
- avoid over-engineering - always make an effort to find the simplest solution and be on the lookup for opportunities to simplify code
- always try to use stock solutions - prefer integrating a mature 3rd party library instead of reimplementing the wheel.
- watch out for stinky code and flag if you see such
