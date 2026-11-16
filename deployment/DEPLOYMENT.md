# Production deployment

## Prerequisites

The production server requires **Docker** (with Compose v2) installed.

## DNS configuration

The app uses multiple domain names, configured in `.env`:

| Variable       | Example             | Purpose                                          |
| -------------- | ------------------- | ------------------------------------------------ |
| `DOMAIN`       | `example.org`       | Main app (frontend + API)                        |
| `ADMIN_DOMAIN` | `admin.example.org` | Admin panel (mTLS-protected)                     |
| `JITSI_DOMAIN` | `meet.example.org`  | Jitsi Meet video calls (proxied through Traefik) |

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

# Create configuration from template
cp .env.example .env

# Edit .env — set domains, passwords, DOCKER_IMAGE_PREFIX, *_VERSION vars, etc.
# IMPORTANT: uncomment COMPOSE_FILE=docker-compose.production.yml in .env
# (all docker compose commands below rely on this being set)

# Pull production images
docker compose pull

# Start services
docker compose up -d

source .env

# TLS certificates are managed automatically by Traefik via ACME/Let's Encrypt.
# No manual certbot setup or cronjob needed — Traefik obtains and renews certs
# on first request to each domain.
```

## Multi-brand deployments

Several brands (sites with their own domain, name and look) can share one database. A single `backend` and a single `worker` serve all of them; only the frontend runs once per brand.

**Configuration**

- Set `BRANDS` in the `.env` used by the backend and the worker. It lists every brand as JSON (see `.env.example`). The backend and worker get only this `.env`, without per-brand overrides.
- Each frontend gets `.env` plus its own brand file (`DOMAIN`, `FRONTEND_URL`, `SITE_NAME`, `WS_BASE_URL`, `FALLBACK_LOCALE`, analytics, …).
- Route `/api` and `/ws` for every brand host to the one backend, for example ``(Host(`a.example.org`) || Host(`b.example.org`)) && PathPrefix(`/api`)``. Keep each frontend's ``Host(`…`)`` router on its own brand.

**How the backend uses the request host**

- Each request is matched to a brand by its host: the brand's domain itself or any subdomain of it (`www.`, `admin.`). Session cookies are scoped to that brand's domain, and a new user is recorded with that brand (`User.originDomain`).
- Login, refresh and the other `/api/auth` routes answer **421** on a host that no brand serves. The proxy must therefore pass the browser's `Host` through, and must not trust a client-supplied `X-Forwarded-Host` (Traefik's default).
- Internal callers that reach the backend by container name (`http://backend:3000/api/admin`, as the admin MCP and import jobs do) are unaffected, because they don't use `/api/auth`. Point them at the backend's service name.
- Emails go out under the recipient's brand (`User.originDomain`). Every `originDomain` in the database must be a domain in `BRANDS`. A user whose domain isn't listed gets no notification emails (the error is logged) and can't request a login link. Before removing a brand from `BRANDS`, move its users to another brand.
- CORS allows every brand's `frontendUrl` origin.

**Moving from one backend per brand**

1. Deploy the new backend image first, with the old one-backend-per-brand services left as they are. Each backend still has the full `BRANDS`, so they keep working.
2. Then merge them into one `backend` service with the combined routes, and give it and the worker the plain `.env`. Update everything that addressed the old service names (`depends_on`, URLs like `http://backend-<brand>:3000`).
3. Live updates (new messages, likes, call signalling) between users on different brands start working only after step 2. Each backend process holds its own WebSocket connections.

**Local development:** set `DOMAIN=localhost`. The Vite dev proxy rewrites `Host` to `localhost`, so any other value gets a 421 on login.

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

4. **Deploy the CA cert** to the path specified by `ADMIN_CA_CERT_FILE` in `.env` (mounted into the Traefik container).

5. **Import `client.p12`** into your browser's certificate store.

## Release Pipeline

The release pipeline consists of these GitHub Actions workflows:

| Workflow          | File                    | Trigger                | Purpose                                          |
| ----------------- | ----------------------- | ---------------------- | ------------------------------------------------ |
| Release           | `release.yml`           | `workflow_dispatch`    | Apply changeset bumps, commit, create GH release |
| Docker Build      | `docker-build.yml`      | `release: published`   | Build and push images to GHCR                    |
| Sentry Sourcemaps | `sentry-sourcemaps.yml` | Docker Build completes | Upload sourcemaps to GlitchTip (secrets-gated)   |

## Firewall

The following ports must be open on the production server:

| Port  | Protocol | Purpose                                           |
| ----- | -------- | ------------------------------------------------- |
| 80    | TCP      | HTTP (ACME challenges, redirect to HTTPS)         |
| 443   | TCP      | HTTPS (all web traffic including Jitsi)           |
| 10000 | UDP      | Jitsi Videobridge media traffic                   |
