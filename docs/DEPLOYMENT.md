# Production Deployment

## Quick Start

```bash
# create default configuration
cp .env.example .env  
# edit .env to customize the instance (see Email Configuration below)
# create data volumes
docker volume create postgres_data
docker volume create certbot-etc
docker volume create certbot-webroot
# obtain TLS cert from Letsencrypt via certbot (configure DOMAIN and EMAIL in .env)
# https://eff-certbot.readthedocs.io/en/latest/install.html#running-with-docker
docker compose -f docker-compose.production.yml run --rm certbot-init
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

## Email Configuration

OpenCupid supports a flexible email system with automatic failover capabilities. The system can be configured in three different scenarios:

### Scenario 1: Listmonk with SMTP Fallback (Recommended)

This is the recommended production setup providing the best deliverability and features:

```env
# Listmonk Configuration (Primary)
LISTMONK_URL=http://listmonk:9000
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=your_secure_password_here
LISTMONK_DB_PASSWORD=listmonk_db_secure_password
LISTMONK_LIST_ID=1

# SMTP Configuration (Fallback)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your_smtp_password
EMAIL_FROM="OpenCupid <noreply@yourdomain.com>"
```

**Features:**
- Template-based transactional emails via Listmonk
- Automatic user synchronization to Listmonk
- SMTP fallback if Listmonk is unavailable
- Advanced email analytics and management
- Subscriber management capabilities

### Scenario 2: SMTP Only

Simple SMTP-only setup for basic email delivery:

```env
# Leave Listmonk variables commented out or empty
# LISTMONK_URL=
# LISTMONK_ADMIN_USER=
# LISTMONK_ADMIN_PASSWORD=
# LISTMONK_DB_PASSWORD=
# LISTMONK_LIST_ID=

# SMTP Configuration (Primary)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-app@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="OpenCupid <your-app@gmail.com>"
```

**Features:**
- Direct SMTP email delivery
- Works with any SMTP provider (Gmail, SendGrid, Mailgun, etc.)
- Simpler setup with fewer dependencies
- No advanced email features or analytics

### Scenario 3: Listmonk Only

Listmonk-only setup (not recommended for production due to lack of fallback):

```env
# Listmonk Configuration (Primary)
LISTMONK_URL=http://listmonk:9000
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=your_secure_password_here
LISTMONK_DB_PASSWORD=listmonk_db_secure_password
LISTMONK_LIST_ID=1

# SMTP Configuration (leave empty for no fallback)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="OpenCupid <noreply@yourdomain.com>"
```

**Note:** This setup provides no fallback mechanism if Listmonk becomes unavailable.

## Docker Services

The production Docker Compose configuration includes the following email-related services:

### Listmonk Database
```yaml
listmonk-db:
  image: postgres:15
  restart: always
  environment:
    POSTGRES_DB: listmonk
    POSTGRES_USER: listmonk
    POSTGRES_PASSWORD: ${LISTMONK_DB_PASSWORD}
  volumes:
    - /srv/listmonk_data:/var/lib/postgresql/data
```

### Listmonk Application
```yaml
listmonk:
  image: listmonk/listmonk:latest
  restart: always
  depends_on:
    - listmonk-db
  environment:
    LISTMONK_app__address: 0.0.0.0:9000
    LISTMONK_db__user: listmonk
    LISTMONK_db__password: ${LISTMONK_DB_PASSWORD}
    LISTMONK_db__database: listmonk
    LISTMONK_db__host: listmonk_db
    LISTMONK_ADMIN_USER: ${LISTMONK_ADMIN_USER}
    LISTMONK_ADMIN_PASSWORD: ${LISTMONK_ADMIN_PASSWORD}
  ports:
    - "9000:9000"
```

## Email Provider System

The system uses a provider pattern with automatic failover:

1. **EmailProviderWithFallback**: Orchestrates between providers
2. **ListmonkEmailProvider**: Handles Listmonk `/api/tx` transactional emails
3. **DirectSMTPEmailProvider**: Traditional SMTP fallback

### Automatic Failover Logic

1. If Listmonk is configured and available → Use Listmonk
2. If Listmonk fails or is unavailable → Fall back to SMTP
3. If SMTP fails → Email delivery fails (logged for monitoring)

### User Synchronization

When using Listmonk, users are automatically synchronized:
- On user registration
- On user profile updates  
- On user login
- Best-effort sync (won't fail user operations if Listmonk is down)

## Environment Variables Reference

### Core Email Variables
```env
# Email sender identity
EMAIL_FROM="Your App Name <noreply@yourdomain.com>"
```

### Listmonk Variables
```env
# Listmonk instance URL (internal Docker network)
LISTMONK_URL=http://listmonk:9000

# Listmonk admin credentials for API access
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=your_secure_admin_password

# Database password for Listmonk PostgreSQL
LISTMONK_DB_PASSWORD=your_secure_db_password

# Default list ID for new subscribers
LISTMONK_LIST_ID=1
```

### SMTP Variables
```env
# SMTP server configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

### Popular SMTP Provider Examples

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your_mailgun_smtp_password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

#### Gmail (App Password Required)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
```

## Monitoring and Troubleshooting

### Check Email Provider Status
```bash
# Check if Listmonk is accessible
curl -u admin:password http://localhost:9000/api/health

# View email worker logs
docker compose logs -f backend | grep -i email

# Check Listmonk logs
docker compose logs -f listmonk
```

### Common Issues

#### Listmonk Connection Failed
- Verify `LISTMONK_URL`, `LISTMONK_ADMIN_USER`, `LISTMONK_ADMIN_PASSWORD`
- Check if Listmonk service is running: `docker compose ps listmonk`
- Check network connectivity between services

#### SMTP Authentication Failed
- Verify SMTP credentials
- Check if SMTP provider requires app-specific passwords
- Ensure correct port and security settings

#### Emails Not Being Sent
- Check email queue: logs will show queue processing
- Verify email worker is running
- Check both Listmonk and SMTP provider logs

## Seeding database

Create the initial set of interest tags:

`docker compose exec backend npx node prisma/seed/Tags.js`


### Configure cron jobs

Add a daily cron job or scheduled task for automatically renewing the TLS certificate.

`docker compose run --rm certbot renew --nginx && docker exec ingress nginx -s reload`
