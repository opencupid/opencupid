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

### Login flow

The app uses magic link (OTP) authentication — no passwords.

1. Go to <https://oc.dev.froggle.org:5173/auth>
2. Enter email: `mookie@froggle.org`
3. Open MailDev at <http://oc.dev.froggle.org:1080/#/>
4. Find the login email, copy the OTP token
5. Paste the token back on the login page at `/auth/otp`

MailDev captures all transactional emails sent by the app (login tokens, notifications, etc.) regardless of recipient address.

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

Full CI suite (install, prisma generate, lint, test, type-check). This is expensive to run and takes a long time, run this only near/after completing a task and when `pnpm test` does not fail.

```bash
pnpm run ci:test
```

Run with coverage:

```bash
pnpm run test:coverage
```

Run build and type check:

```bash
pnpm build
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

### Database queries (Claude MCP)

The `postgres` MCP server provides direct SQL access to the dev database during debugging. Prefer this instead of `docker exec` / `psql` commands for faster iteration.

## Git workflow

> **HARD RULE — NO EXCEPTIONS:** You MUST NEVER commit anything to the `main` branch. Not documentation, not design files, not a single line. Every commit goes on a feature branch. If you are on `main`, stop and create a branch before touching anything.

Always work in a feature branch and open a Github pull request once task is complete and tests succeed.

```bash
git checkout -b your-branch-name
# ... make changes, commit ...
pnpm test                    # MUST pass before push
git push -u origin your-branch-name
gh pr create
```

## CI workflow

Only watch CI when **finalizing** a PR (all work done, ready for review/merge). Do NOT watch CI after every intermediate push — it wastes time. When finalizing:

```bash
gh run list --limit 1
gh run watch --exit-status    # blocks until the run finishes
```

- If the run **passes**, you're done.
- If the run **fails**, download the logs, diagnose the failure, fix the code, commit, push, and watch again:

```bash
gh run view --log-failed     # show only the failed step logs
```

Repeat until CI is green. Never leave a finalized PR with a failing CI run.

Each PR must contain **one logical change** — don't bundle unrelated fixes, features, or refactors into a single branch. If you discover something unrelated while working (e.g. a typo, a small bug, a cleanup opportunity), finish your current PR first, then open a separate one. If in doubt whether a change belongs on the current branch, ask before committing.

## Releases

### Versioning strategy

- **Bugfix-only releases**: bump the patch version (e.g. 0.7.1 → 0.7.2)
- **New features or enhancements**: bump the minor version (e.g. 0.7.2 → 0.8.0)
- If the user specifies an explicit version, use that instead

### Release process

Run these steps in order:

1. **Bump `version` in `package.json`** on a feature branch, create a PR, and merge it:

   ```bash
   git checkout main && git pull
   git checkout -b chore/bump-version-X.Y.Z
   # edit package.json version field
   git add package.json && git commit -m "chore: bump version to X.Y.Z"
   git push -u origin chore/bump-version-X.Y.Z
   gh pr create --title "chore: bump version to X.Y.Z" --body "Bump package.json version ahead of release."
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

3. **Watch the Docker build** — creating the release auto-triggers the Docker workflow. Confirm all images push successfully:

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

## Development Guidelines

Development guidelines and best practices for this project.

### SOLID Principles

Five design principles that make software more maintainable, flexible, and scalable. Always adhere to these.

## DRY Principle (Don't Repeat Yourself)

- Extract repeated UI patterns into reusable components
- Never hardcode a value more than once
- Separate business logic from UI components
- Create utility functions for common operations

## KISS Principle (Keep It Simple, Stupid)

- Write self-explanatory code with clear variable/function names
- Avoid over-engineering simple problems
- Minimize external dependencies
- Break down complex widgets into smaller, manageable pieces
- Start simple, add complexity only when necessary

---

## YAGNI Principle (You Aren't Gonna Need It)

- Don't implement functionality until it's actually needed.
- Resist the urge to build features "just in case" they might be useful later
- Focus on current requirements, not hypothetical future needs
- Don't create abstract layers for one implementation
- Avoid premature optimization before measuring performance
- Don't build configuration systems until you need configurability
- Wait for actual use cases before adding flexibility
