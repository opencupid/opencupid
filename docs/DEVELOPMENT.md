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
docker compose up -d   # start DB, Redis and Maildev
pnpm install
cp .env.example .env   # create default configuration
set -a; source .env; set +a  # import configuration into current shell
pnpm  --filter backend prisma:generate         # generate prisma client code
pnpm  --filter backend prisma:deploy           # create/init DB
pnpm dev
```

## Running tests and code quality checks

```bash
pnpm install 
pnpm --filter backend prisma:generate  # generate prisma client

pnpm test  # this runs all of the tests in backend/frontend

# lint
pnpm lint
pnpm --filter frontend type-check
```