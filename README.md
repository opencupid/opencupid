# OpenCupid

OpenCupid is a free and open matchmaking application built to serve existing communities.

Within every circle — whether that’s a collective, association, ecovillage or shared-interest group — there are countless valuable connections waiting to happen. Yet in real life, many of these remain hidden because the existing social network platforms don't facilitate discovery and members are often scattered all over the place. OpenCupid helps surface these connections in a safe and intentional way, connections that can evolve into meaningful bonds — whether that’s friendship, collaboration, or romantic partnership — within circles they already belong to.  

At its core, the platform is privacy-preserving and based on reciprocity: you only see the details others choose to share if you’ve shared the same information yourself, and only if your preferences match theirs. Consent is fundamental: nobody can approach you unless you’ve explicitly given permission. This creates a safer, more respectful environment where connections grow on mutual terms.  

Unlike commercial matchmaking apps, OpenCupid is free from dark patterns and manipulative design. There are no hidden algorithms trying to keep you hooked, no upsells, and no data exploitation. Just a simple, transparent tool that communities can use to connect their members in an open, fair, and trust-first way.  

## Stack

- Frontend: Vue 3 + Bootstrap 5 + Vite
- Backend: Node.js + Fastify + Prisma
- DB: PostgreSQL

## Getting started with development

```bash
docker compose up -d # start DB and Redis
pnpm install
cp .env.example .env
pnpm dev
```

## Running tests and code quality checks

```bash
pnpm install 
pnpm --filter backend generate  # generate prisma client

pnpm test  # this runs all of the tests in backend/frontend

# lint
pnpm lint
pnpm --filter frontend type-check
```

## Running a production instance
```bash
# create default configuration
cp .env.example .env  
# edit .env to customize the instance
# create data volumes
docker volume create postgres_data
docker volume create certbot-etc
docker volume create certbot-webroot
# obtain TLS cert from Letsencrypt via certbot  (https://eff-certbot.readthedocs.io/en/latest/install.html#running-with-docker)
docker compose -f docker-compose.production.yml run --rm certbot-init
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

## Call for collaborators

If you like the project and would like to improve it in some way, there are several ways to contribute:

* Run the software in your community
* OpenCupid currently speaks English and Hungarian. We are looking for help translating into other languages to make the software accessible to more communities. 
* Test the platform and file issues for bugs/problems you find (don't need to be a developer to do this)
* Work on open Github issues

🙏
