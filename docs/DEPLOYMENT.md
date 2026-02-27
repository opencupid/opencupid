# Production deployment

## Prerequisites

The production server requires **Docker** (with Compose v2) installed.

## DNS configuration

The app uses multiple domain names, configured in `.env`:

| Variable       | Example             | Purpose                                          |
| -------------- | ------------------- | ------------------------------------------------ |
| `DOMAIN`       | `example.org`       | Main app (frontend + API)                        |
| `ADMIN_DOMAIN` | `admin.example.org` | Admin panel (mTLS-protected)                     |
| `JITSI_DOMAIN` | `meet.example.org`  | Jitsi Meet video calls (proxied through ingress) |

### DNS setup

All domains must resolve to the production server. A typical configuration:

| Record              | Type  | Value         |
| ------------------- | ----- | ------------- |
| `example.org`       | A     | `<server-ip>` |
| `admin.example.org` | CNAME | `example.org` |
| `meet.example.org`  | CNAME | `example.org` |

The root domain uses an A record pointing to the server's public IP. All subdomains use CNAME records pointing to the root domain.

All domains share a single SAN certificate obtained by certbot (see [Getting started](#getting-started)).

## Getting started

```bash
# clone the repo
git clone https://github.com/opencupid/opencupid.git && cd opencupid

# create configuration from template
cp .env.example .env

# edit .env — at minimum set:
#   COMPOSE_FILE=docker-compose.production.yml
#   DOMAIN, ADMIN_DOMAIN, EMAIL
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

## Management commands

All management commands are defined as pnpm scripts in `apps/backend/package.json` and run inside containers via `docker compose exec`.

### Database

```bash
pnpm --filter backend db:psql                    # Interactive psql
pnpm --filter backend db:dump > dump.sql         # Data-only dump
pnpm --filter backend db:backup > bak.sql        # Full backup (schema + data)
pnpm --filter backend db:restore < bak.sql       # Restore from backup
```

### Redis

```bash
pnpm --filter backend redis:flush                # Flush all data
pnpm --filter backend redis:sessions             # List all keys
```

### Prisma (migrations)

```bash
pnpm --filter backend prisma:deploy              # Run pending migrations (production)
pnpm --filter backend prisma:generate            # Regenerate Prisma client
```

### Other

```bash
pnpm --filter backend images:reprocess           # Reprocess profile images
pnpm --filter backend tags:translate             # Translate tags via DeepL
```

## Seeding database

Create the initial set of interest tags:

```bash
pnpm --filter backend prisma:seed
```

## Admin Panel

The admin panel is a standalone Vue SPA served at `https://<ADMIN_DOMAIN>/`.

### Access control

The admin domain is protected by **mutual TLS (mTLS)** — only clients presenting a valid certificate signed by the trusted CA can connect.

### Client certificate setup

1. **Generate a CA** (one-time):

   ```bash
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -subj "/CN=Admin CA"
   ```

2. **Issue a client certificate**:

   ```bash
   openssl genrsa -out client.key 2048
   openssl req -new -key client.key -out client.csr -subj "/CN=admin-user"
   openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt
   ```

3. **Export as PKCS#12** for browser import:

   ```bash
   openssl pkcs12 -export -out client.p12 -inkey client.key -in client.crt -certfile ca.crt
   ```

4. **Deploy the CA cert** as `/etc/nginx/client-ca.crt` on the server (mounted into the ingress container).

5. **Import `client.p12`** into your browser's certificate store.

## Sentry / GlitchTip Sourcemap Uploads

The Sentry Sourcemaps workflow (`.github/workflows/sentry-sourcemaps.yml`) uploads frontend and backend sourcemaps to GlitchTip so that error stack traces show original source code instead of minified bundles. It runs automatically after the Docker Build workflow completes and is **secrets-gated** — it skips gracefully when `SENTRY_AUTH_TOKEN` is not configured (e.g. in forks).

### How it works

The workflow:

1. Builds frontend and backend locally to produce `dist/` with sourcemaps
2. Runs `sentry-cli sourcemaps inject` to stamp debug IDs into the files
3. Runs `sentry-cli sourcemaps upload` to push the artifact bundle to GlitchTip

The job is marked `continue-on-error: true` — if the upload fails, Docker images are still pushed and the release succeeds.

### GitHub configuration

The workflow reads Sentry config from GitHub secrets and variables:

| Type     | Name                | Value                         |
| -------- | ------------------- | ----------------------------- |
| Secret   | `SENTRY_AUTH_TOKEN` | GlitchTip API auth token      |
| Variable | `SENTRY_URL`        | `https://lsentry.example.org` |
| Variable | `SENTRY_ORG`        | `example_org`                 |
| Variable | `SENTRY_PROJECT`    | `example_proj`                |

### Release naming

Sourcemaps are tagged with release names that match the Sentry SDK configuration:

| App      | Release format       | Example           |
| -------- | -------------------- | ----------------- |
| Frontend | `frontend@{version}` | `frontend@0.12.2` |
| Backend  | `api@{version}`      | `api@0.12.2`      |

The version is read from the root `package.json`.

## Release Pipeline

The release pipeline consists of two independent GitHub Actions workflows:

| Workflow          | File                    | Trigger                | Purpose                        |
| ----------------- | ----------------------- | ---------------------- | ------------------------------ |
| Docker Build      | `docker-build.yml`      | `release: published`   | Build and push images to GHCR  |
| Sentry Sourcemaps | `sentry-sourcemaps.yml` | Docker Build completes | Upload sourcemaps to GlitchTip |

Sentry Sourcemaps triggers automatically after Docker Build completes. It is **secrets-gated** — it skips gracefully when `SENTRY_AUTH_TOKEN` is not configured (e.g. in forks).

## Firewall

The following ports must be open on the production server:

| Port  | Protocol | Purpose                                           |
| ----- | -------- | ------------------------------------------------- |
| 80    | TCP      | HTTP (certbot ACME challenges, redirect to HTTPS) |
| 443   | TCP      | HTTPS (all web traffic including Jitsi)           |
| 10000 | UDP      | Jitsi Videobridge media traffic                   |
