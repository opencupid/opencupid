# Development

## Dependencies

```bash
sudo apt-get install ripgrep
```

### Optional: postgres-mcp (for Claude Code)

Gives Claude direct SQL access to the dev database via MCP. Requires Python 3.12+.

```bash
uv python install 3.12
uv venv --python 3.12 ~/.venvs/postgres-mcp
VIRTUAL_ENV=~/.venvs/postgres-mcp uv pip install postgres-mcp
```

Already configured in `.claude/settings.json` — no further setup needed after install.

## Getting started with development

```bash
docker compose up -d   # start DB, Redis and Mailpit
pnpm install
cp .env.example .env   # create default configuration
set -a; source .env; set +a  # import configuration into current shell
pnpm  --filter backend prisma:generate         # generate prisma client code
pnpm  --filter backend prisma:deploy           # create/init DB
pnpm dev
```

## Internationalization (i18n)

Translation strings live in `packages/shared/i18n/` as JSON files (`en.json`, `hu.json`, and an `api/` subdirectory for backend error messages).

**Tolgee** is the local translation management UI. Start it alongside the other dev services:

```bash
docker compose up -d tolgee
# UI available at http://localhost:8085  (admin / admin)
```

**Push/pull workflow:**

```bash
pnpm tolgee:push   # upload local JSON → Tolgee (after adding new keys in code)
pnpm tolgee:pull   # download translated JSON ← Tolgee (after translating in UI)
```

After pulling, commit the updated JSON files in `packages/shared/i18n/`.

To add a new translation key, add it to `packages/shared/i18n/en.json` first (English is the source language), then use `tolgee:push` to make it available for translation in the UI.

## Running tests and code quality checks

```bash
pnpm install
pnpm --filter backend prisma:generate  # generate prisma client

pnpm test  # this runs all of the tests in backend/frontend

# lint
pnpm lint
pnpm --filter frontend type-check
```
