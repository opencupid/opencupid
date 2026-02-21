# Production deployment

## Prerequisites

The production server needs only **Docker** (with Compose v2) installed. Everything else runs inside containers.

## Domain name configuration

The app uses multiple domain names, configured in `.env`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DOMAIN` | `example.org` | Main app (frontend + API) |
| `ADMIN_DOMAIN` | `admin.example.org` | Admin panel (mTLS-protected, hosts Listmonk admin) |
| `LISTMONK_DOMAIN` | `lists.example.org` | Public Listmonk URLs (subscription/campaign pages) |
| `JITSI_DOMAIN` | `meet.example.org` | Jitsi Meet video calls (proxied through ingress) |

Create DNS A/CNAME records for all subdomains pointing to the same server. All domains share a single SAN certificate obtained by certbot.

## Getting started

```bash
# clone the repo
git clone https://github.com/opencupid/opencupid.git && cd opencupid

# create configuration from template
cp .env.example .env

# edit .env — at minimum set:
#   COMPOSE_FILE=docker-compose.production.yml
#   DOMAIN, ADMIN_DOMAIN, LISTMONK_DOMAIN, EMAIL
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   JWT_SECRET, AUTH_IMG_HMAC_SECRET
#   JVB_ADVERTISE_IPS (public IP of the host)

# create data volumes
docker volume create postgres_data
docker volume create certbot-etc
docker volume create certbot-webroot

# obtain TLS cert from Letsencrypt
docker compose run --rm --service-ports certbot-init

# build and start
docker compose build
docker compose up -d
```

> **Key**: Setting `COMPOSE_FILE=docker-compose.production.yml` in `.env` means all
> `docker compose` commands automatically use the production file — no `-f` flag needed.

## Docker Compose file selection

Docker Compose reads `COMPOSE_FILE` from `.env` in the project root automatically.

| Environment | `COMPOSE_FILE` in `.env` | Effect |
|-------------|--------------------------|--------|
| Development | *(unset)* | Uses `docker-compose.yml` (infrastructure only) |
| Production | `docker-compose.production.yml` | Full stack with ingress, certbot, Jitsi |

## Database configuration

Database credentials are configured once in `.env` and flow everywhere automatically:

```
POSTGRES_DB=app
POSTGRES_USER=appuser
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://appuser:<password>@db:5432/app
```

- **Docker Compose** injects `POSTGRES_*` vars into the `db` container
- **Prisma / backend app** reads `DATABASE_URL` from the environment
- **Management scripts** (`db:psql`, `db:dump`, etc.) read `POSTGRES_USER` and `POSTGRES_DB` from the container's environment — no hardcoded credentials

## Management commands

All management commands run inside containers via `docker compose exec`.

### Database

```bash
docker compose exec db sh -c 'psql -U $POSTGRES_USER $POSTGRES_DB'            # Interactive psql
docker compose exec db sh -c 'pg_dump --data-only -U $POSTGRES_USER $POSTGRES_DB' > dump.sql  # Data-only dump
docker compose exec db sh -c 'pg_dump --clean -U $POSTGRES_USER $POSTGRES_DB' > bak.sql       # Full backup
docker compose exec -T db sh -c 'psql -U $POSTGRES_USER $POSTGRES_DB' < bak.sql               # Restore
```

### Redis

```bash
docker compose exec redis redis-cli FLUSHALL    # Flush all data
docker compose exec redis redis-cli KEYS '*'    # List all keys
```

### Prisma (migrations)

```bash
docker compose exec backend npx prisma migrate deploy   # Run pending migrations (production)
docker compose exec backend npx prisma generate          # Regenerate Prisma client
```

### Other

```bash
docker compose exec backend npx tsx scripts/reprocess-images.ts          # Reprocess profile images
docker compose exec backend npx node scripts/translate-tags-deepl.js     # Translate tags via DeepL
docker compose exec backend pnpm listmonk:migrate                        # One-time user sync to Listmonk
```

## Seeding database

Create the initial set of interest tags:

```bash
docker compose exec backend npx node prisma/seed/Tags.js
```

## Listmonk Configuration

### Creating an API Token

The backend uses Listmonk's custom token authentication to communicate with the API. To create an API token:

1. **Access Listmonk Admin UI**: Navigate to `https://<ADMIN_DOMAIN>/listmonk/` and log in with your admin credentials
2. **Create API User**: Go to **Settings** → **Users** → Click **+ New**
3. **Configure User**:
   - Type: Select "API" user type
   - Username: Choose a username (e.g., `api_user`)
   - Role: Assign appropriate permissions (typically "Manager" or create a custom role)
4. **Save and Copy Token**: When you save, Listmonk will display the API token **once**. Copy both the username and token immediately.
5. **Update Configuration**: Set `LISTMONK_API_TOKEN` in your `.env` file in the format `username:token`:
   ```
   LISTMONK_API_TOKEN=api_user:BDqyWm3XX5jgEMrSqL5cRAt9VjGg23aU
   ```

**Note**:
- The token is only shown once during creation. If you lose it, create a new API user.
- The format is `Authorization: token username:token_value` (lowercase "token")
- Do NOT use the admin username/password — create a dedicated API user

### Listmonk Migration

After deploying the Listmonk integration, run the one-time migration script to sync existing users to Listmonk:

```bash
docker compose exec backend pnpm listmonk:migrate
```

This will:
1. Find all users with email addresses
2. Sync them to Listmonk via the API
3. Set their subscription status based on the `newsletterOptIn` flag
4. Configure their language preference

The script is idempotent and can be safely run multiple times.

## Jitsi Video Calls

Jitsi Meet is proxied through the ingress on port 443 using a subdomain (`meet.<DOMAIN>`).

### Prerequisites

1. **DNS**: Create an A or CNAME record for `meet.<DOMAIN>` pointing to the same server.
2. **TLS certificate**: The cert must cover the Jitsi subdomain. Either:
   - Use a wildcard cert (`*.<DOMAIN>`) — no extra steps needed.
   - Or add the subdomain when obtaining the cert:
     ```bash
     docker compose run --rm certbot certonly \
       --webroot -w /var/www/html \
       -d ${DOMAIN} -d meet.${DOMAIN} \
       --email ${EMAIL} --agree-tos --no-eff-email
     ```
3. **Environment**: Set `JITSI_DOMAIN=meet.<DOMAIN>` in `.env` (no port number — traffic goes through 443 via the ingress).

### JVB (media routing)

Set `JVB_ADVERTISE_IPS` in `.env` to the public IP of the Docker host so that the Jitsi Videobridge can route media traffic correctly. Port `10000/udp` must be open in the firewall.

## TLS certificate renewal

Add a daily cron job for automatic certificate renewal:

```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/opencupid/scripts/renew-cert.sh >> /var/log/ssl-renewal.log 2>&1
```

Or run manually:

```bash
./scripts/renew-cert.sh
```

The renewal script uses `docker compose` (which reads `COMPOSE_FILE` from `.env`) to:
1. Run certbot renewal using the webroot method
2. Reload the nginx configuration if renewal is successful

## CD Pipeline (recommendations)

The app currently uses a manual deploy workflow: merge to main → GHA builds Docker images → SSH to server → pull and restart. Below are options for automating this.

### Option A: GitHub Actions SSH deploy (recommended)

Add a deploy job to `release.yml` that SSHes to the production server after images are built:

```
merge to main → GHA builds images → GHA SSHes to prod → deploy.sh
```

A `deploy.sh` on the server would:

1. `docker compose pull` — pull the new images
2. `docker compose exec backend npx prisma migrate deploy` — run pending DB migrations
3. `docker compose up -d` — restart with new images

**Prisma `migrate deploy`** is production-safe: it only applies pending migrations forward, is non-interactive, and never generates or modifies migration files. It can run against the live database before restarting the app.

**Pros**: Full control, migration-aware, uses existing GHA infrastructure.
**Cons**: Requires SSH key management (store as GitHub secret).

### Option B: Watchtower (simplest)

[Watchtower](https://github.com/containrrr/watchtower) runs as a container and auto-pulls new `:latest` images, restarting services when updates are detected.

**Pros**: Zero-config, no SSH keys, just add a container.
**Cons**: No migration step — would need a separate mechanism (e.g., entrypoint script in the backend container that runs `prisma migrate deploy` on startup).

### Migration safety notes

- Always back up the database before deploying migrations that drop columns or tables
- Prisma migrations are append-only and versioned — they can be reviewed in PRs before merging
- For zero-downtime deploys: ensure new code is backward-compatible with the old schema, deploy migrations first, then roll out new containers
