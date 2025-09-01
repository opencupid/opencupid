# Development

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

## Newsletter functionality (optional)

To enable newsletter functionality with Listmonk:

```bash
# Start Listmonk alongside the other services
docker compose -f docker-compose.yml -f docker-compose.listmonk.yml up -d
```

After starting, Listmonk will be available at http://localhost:9000 with the default admin credentials (admin/admin). The newsletter system will automatically sync user subscriptions with Listmonk.

## Running tests and code quality checks

```bash
pnpm install 
pnpm --filter backend prisma:generate  # generate prisma client

pnpm test  # this runs all of the tests in backend/frontend

# lint
pnpm lint
pnpm --filter frontend type-check
```