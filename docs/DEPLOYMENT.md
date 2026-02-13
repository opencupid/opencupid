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
docker compose -f docker-compose.production.yml run --rm certbot-init
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

## Seeding database

Create the initial set of interest tags:

`docker compose exec backend npx node prisma/seed/Tags.js`


### Configure cron jobs

Add a daily cron job or scheduled task for automatically renewing the TLS certificate.

`docker compose run --rm certbot renew --nginx && docker exec ingress nginx -s reload`
