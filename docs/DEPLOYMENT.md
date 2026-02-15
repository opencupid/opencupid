# Production deployment

```bash
# create default configuration
cp .env.example .env  
# edit .env to customize the instance
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

The backend uses Basic Authentication with API tokens to communicate with Listmonk. To create an API token:

1. **Access Listmonk Admin UI**: Navigate to `http://your-domain:9000` and log in with your admin credentials
2. **Create API User**: Go to **Settings** → **Users** → Click **+ New**
3. **Configure User**:
   - Type: Select "API" user type
   - Username: Choose a username (e.g., `api_user`)
   - Role: Assign appropriate permissions (typically "Manager" or create a custom role)
4. **Save and Copy Token**: When you save, Listmonk will display the API token **once**. Copy it immediately.
5. **Update Configuration**: Set `LISTMONK_API_TOKEN` in your `.env` file in the format `username:token`:
   ```
   LISTMONK_API_TOKEN=api_user:abc123def456xyz789
   ```

**Testing the API token with curl:**
```bash
# Test that your token works:
curl -u "api_user:abc123def456xyz789" http://localhost:9000/api/lists
```

**Note**: The token is only shown once during creation. If you lose it, you'll need to create a new API user.

**For development**: You can temporarily use your admin credentials in the same format:
```
LISTMONK_API_TOKEN=admin:your_admin_password
```

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
