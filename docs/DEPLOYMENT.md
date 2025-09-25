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
