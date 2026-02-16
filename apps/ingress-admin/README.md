# Admin Ingress Configuration

This directory contains the configuration for the admin ingress reverse proxy. The admin ingress provides access to administrative tools like Listmonk email management.

## Features

- TLS client certificate authentication for security
- Reverse proxy to Listmonk on `/listmonk` path
- Minimalistic admin landing page
- Separate SSL certificate for admin subdomain

## TLS Client Certificate Authentication

The admin ingress requires TLS client certificates for authentication. This provides strong authentication without passwords.

### Setting Up Client Certificates

#### 1. Create a Certificate Authority (CA)

```bash
# Create CA private key
openssl genrsa -out ca.key 4096

# Create CA certificate (valid for 10 years)
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=OpenCupid Admin CA"
```

#### 2. Create Client Certificate

```bash
# Create client private key
openssl genrsa -out client.key 2048

# Create certificate signing request
openssl req -new -key client.key -out client.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=Admin User"

# Sign the client certificate with CA
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
  -set_serial 01 -out client.crt

# Create PKCS12 bundle for browser import (optional)
openssl pkcs12 -export -out client.p12 -inkey client.key -in client.crt -certfile ca.crt
```

#### 3. Configure the Server

Place the CA certificate in the directory specified by `CLIENT_CERT_DIR` (default: `./client-certs`):

```bash
mkdir -p /srv/client-certs
cp ca.crt /srv/client-certs/
chmod 644 /srv/client-certs/ca.crt
```

#### 4. Import Client Certificate to Browser

- **Chrome/Edge**: Settings → Privacy and Security → Manage Certificates → Import → Select `client.p12`
- **Firefox**: Settings → Privacy & Security → View Certificates → Your Certificates → Import → Select `client.p12`
- **Safari**: Double-click `client.p12` and add to Keychain

### Using curl with Client Certificate

```bash
curl --cert client.crt --key client.key https://admin.example.org/
```

## SSL Certificate Setup

### Option 1: Separate Certificates (Recommended)

Run certbot-init for each domain separately:

```bash
# Initialize cert for main domain
docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init

# Initialize cert for admin domain  
docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init-admin
```

### Option 2: Multi-Domain Certificate (Alternative)

Certbot supports multiple domains in a single certificate using Subject Alternative Names (SAN). To use this approach:

1. Modify the `certbot-init` command in `docker-compose.production.yml`:

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

2. Update both nginx configs to use the same certificate path:

```nginx
ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
```

**Pros**: Single certificate to manage, DRY approach
**Cons**: Both domains must be validated together, cert renewal affects both services

### Option 3: Wildcard Certificate (Alternative)

Use a wildcard certificate for `*.example.org`:

**Requires DNS validation** (standalone won't work):

```bash
docker compose -f docker-compose.production.yml run --rm certbot-init \
  certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d '*.example.org' \
  -d 'example.org'
```

**Pros**: Covers all subdomains automatically
**Cons**: Requires DNS provider API access, more complex setup

## Environment Variables

Add to `.env`:

```bash
# Admin domain
ADMIN_DOMAIN=admin.example.org

# Client certificate directory
CLIENT_CERT_DIR=/srv/client-certs
```

## Port Configuration

- **ingress**: 443 (HTTPS), 80 (HTTP)
- **ingress-admin**: 8443 (HTTPS), 8080 (HTTP)

In production, use a load balancer or additional reverse proxy to route:
- `example.org` → `ingress:443`
- `admin.example.org` → `ingress-admin:8443`

## Accessing Admin Interface

1. Visit `https://admin.example.org` (or configured port)
2. Browser will prompt for client certificate
3. Select the imported client certificate
4. Access admin landing page with link to Listmonk

## Security Notes

- Keep CA private key (`ca.key`) secure and offline
- Regularly rotate client certificates (recommended: annually)
- Limit CA certificate validity period
- Monitor access logs for unauthorized attempts
- Consider using hardware security keys for client certificates
- Set `ssl_verify_client on` (currently `optional`) for stricter security

## Troubleshooting

### "403 Forbidden" Error

- Ensure client certificate is properly installed in browser
- Verify CA certificate exists in `CLIENT_CERT_DIR`
- Check nginx error logs: `docker logs opencupid-ingress-admin-1`

### Certificate Not Found

- Verify `ADMIN_DOMAIN` is set in `.env`
- Ensure certbot initialization completed successfully
- Check certificate path: `ls -la /srv/certbot/live/`

### Listmonk Not Accessible

- Verify listmonk service is running: `docker ps | grep listmonk`
- Check network connectivity between containers
- Review nginx access/error logs
