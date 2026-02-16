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

## Admin Ingress Configuration

The admin ingress provides secure access to administrative tools via a separate subdomain (e.g., `admin.example.org`) with TLS client certificate authentication.

### Features

- **TLS Client Certificate Authentication**: Strong authentication without passwords
- **Listmonk Access**: Email management interface at `/listmonk`
- **Admin Landing Page**: Central hub for administrative tools
- **Separate SSL Certificate**: Independent certificate management

### Initial Setup

#### 1. Configure Environment Variables

Add to your `.env` file:

```bash
ADMIN_DOMAIN=admin.example.org
CLIENT_CERT_DIR=/srv/client-certs
```

#### 2. Generate Client Certificates

Run the provided script to generate client certificates:

```bash
./scripts/generate-client-certs.sh /srv/client-certs
```

This creates:
- `ca.crt` - CA certificate (used by nginx)
- `ca.key` - CA private key (keep secure!)
- `client.crt` - Client certificate
- `client.key` - Client private key
- `client.p12` - Browser-importable certificate (password: changeme)

**Security Note**: Keep the CA private key (`ca.key`) offline and secure. Only the CA certificate (`ca.crt`) needs to be on the server.

#### 3. Obtain SSL Certificate

Choose one of these strategies:

**Option A: Separate Certificates (Recommended)**

Obtain separate certificates for each domain:

```bash
# Main domain certificate
docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init

# Admin domain certificate
docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init-admin
```

**Option B: Multi-Domain Certificate (DRY approach)**

Modify `certbot-init` in `docker-compose.production.yml` to include both domains:

```yaml
command:
  - certonly
  - -d
  - ${DOMAIN}
  - -d
  - ${ADMIN_DOMAIN}
  - --email
  - ${EMAIL}
  - --agree-tos
  - --no-eff-email
  - --standalone
```

Then update both nginx configs to use the same certificate path (see `apps/ingress-admin/README.md` for details).

**Option C: Wildcard Certificate**

Use DNS validation to obtain a wildcard certificate for `*.example.org`. Requires DNS provider API access (Cloudflare, Route53, etc.).

#### 4. Configure Load Balancer / Reverse Proxy

The admin ingress runs on ports 8443/8080. Configure your load balancer or external reverse proxy to route traffic:

- `example.org` → `ingress:443`
- `admin.example.org` → `ingress-admin:8443`

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name admin.example.org;
    
    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;
    
    location / {
        proxy_pass https://localhost:8443;
    }
}
```

Or use iptables for direct port mapping:

```bash
iptables -t nat -A PREROUTING -p tcp -d admin.example.org --dport 443 -j REDIRECT --to-port 8443
```

#### 5. Start Services

```bash
docker compose -f docker-compose.production.yml up -d ingress-admin
```

### Accessing Admin Interface

1. **Import Client Certificate to Browser**
   - Chrome/Edge: Settings → Privacy and Security → Manage Certificates → Import `client.p12`
   - Firefox: Settings → Privacy & Security → View Certificates → Your Certificates → Import `client.p12`
   - Use password: `changeme` (or your custom password)

2. **Visit Admin Interface**
   - Navigate to `https://admin.example.org`
   - Browser will prompt for client certificate selection
   - Select the imported certificate
   - Access admin landing page with link to Listmonk

### Testing with curl

```bash
# Test with client certificate
curl --cert /srv/client-certs/client.crt \
     --key /srv/client-certs/client.key \
     https://admin.example.org/

# Test Listmonk proxy
curl --cert /srv/client-certs/client.crt \
     --key /srv/client-certs/client.key \
     https://admin.example.org/listmonk/
```

### Security Best Practices

- Keep CA private key offline and secure
- Regularly rotate client certificates (recommended: annually)
- Limit CA certificate validity period
- Monitor nginx access logs for unauthorized attempts
- Consider using `ssl_verify_client on` instead of `optional` for stricter security
- Use hardware security keys for client certificates when possible
- Implement certificate revocation lists (CRL) for compromised certificates

### Troubleshooting

**"403 Forbidden" Error**
- Verify client certificate is installed in browser
- Check CA certificate exists: `ls -la /srv/client-certs/ca.crt`
- Review nginx logs: `docker logs <container-name>`
- Ensure `ssl_client_verify` is not set to `on` if testing without cert

**Certificate Not Found**
- Verify `ADMIN_DOMAIN` in `.env`
- Check certbot success: `docker compose logs certbot-init-admin`
- Verify certificate path: `ls -la /srv/certbot/live/`

**Listmonk Not Accessible**
- Check listmonk is running: `docker ps | grep listmonk`
- Verify network connectivity: `docker network inspect opencupid_default`
- Test direct access: `curl http://localhost:9000`
- Review proxy logs in nginx error log

**Port Already in Use**
- Modify ports in `docker-compose.production.yml` if 8443/8080 are in use
- Update your load balancer/proxy configuration accordingly

For more details, see `apps/ingress-admin/README.md`.
