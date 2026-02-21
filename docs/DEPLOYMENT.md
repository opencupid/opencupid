# Production deployment

## Domain name configuration

The app uses three domain names, configured in `.env`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DOMAIN` | `example.org` | Main app (frontend + API) |
| `ADMIN_DOMAIN` | `admin.example.org` | Admin panel (mTLS-protected, hosts Listmonk admin) |
| `LISTMONK_DOMAIN` | `lists.example.org` | Public Listmonk URLs (subscription/campaign pages) |

Create DNS CNAME records pointing `ADMIN_DOMAIN` and `LISTMONK_DOMAIN` to `DOMAIN` (or A records to the same IP). All three domains are included in a single SAN certificate obtained by certbot.

## Getting started

```bash
# create default configuration
cp .env.example .env
# edit .env to customize the instance (set DOMAIN, ADMIN_DOMAIN, LISTMONK_DOMAIN, EMAIL)
# create data volumes
docker volume create postgres_data
docker volume create certbot-etc
docker volume create certbot-webroot
# obtain TLS cert from Letsencrypt via certbot (configure DOMAIN and EMAIL in .env)
# https://eff-certbot.readthedocs.io/en/latest/install.html#running-with-docker
docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

## Seeding database

Create the initial set of interest tags:

`docker compose exec backend npx node prisma/seed/Tags.js`

## Listmonk Configuration

### Creating an API Token

The backend uses Listmonk's custom token authentication to communicate with the API. To create an API token:

1. **Access Listmonk Admin UI**: Navigate to `http://your-domain:9000` and log in with your admin credentials
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
   Replace `api_user` with your API username and the token value with the one Listmonk generated.

**Testing the API token with curl:**
```bash
# Test that your token works (replace with your actual username and token):
curl -H "Authorization: token api_user:BDqyWm3XX5jgEMrSqL5cRAt9VjGg23aU" http://localhost:9000/api/lists
```

**Note**: 
- The token is only shown once during creation. If you lose it, you'll need to create a new API user.
- The format is `Authorization: token username:token_value` (lowercase "token")
- Do NOT use the admin username/password - create a dedicated API user

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

1. **DNS**: Create an A or CNAME record for `meet.<DOMAIN>` pointing to the same server as `<DOMAIN>`.
2. **TLS certificate**: The cert must cover the Jitsi subdomain. Either:
   - Use a wildcard cert (`*.<DOMAIN>`) — no extra steps needed.
   - Or add the subdomain when obtaining the cert:
     ```bash
     docker compose -f docker-compose.production.yml run --rm certbot certonly \
       --webroot -w /var/www/html \
       -d ${DOMAIN} -d meet.${DOMAIN} \
       --email ${EMAIL} --agree-tos --no-eff-email
     ```
3. **Environment**: Set `JITSI_DOMAIN=meet.<DOMAIN>` in `.env` (no port number — traffic goes through 443 via the ingress).

### JVB (media routing)

Set `JVB_ADVERTISE_IPS` in `.env` to the public IP of the Docker host so that the Jitsi Videobridge can route media traffic correctly. Port `10000/udp` must be open in the firewall.

### Configure cron jobs

Add a daily cron job or scheduled task for automatically renewing the TLS certificate.

Run the SSL certificate renewal script once daily:

```bash
# Add this line to your crontab (run 'crontab -e' to edit)
0 2 * * * /path/to/opencupid/scripts/renew-cert.sh >> /var/log/ssl-renewal.log 2>&1
```

Or run manually:

```bash
./scripts/renew-cert.sh
```

The renewal script will:
1. Run certbot renewal using the webroot method
2. Reload the nginx configuration if renewal is successful
3. Log the process for monitoring
