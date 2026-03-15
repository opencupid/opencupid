FROM node:22-trixie AS builder
WORKDIR /app

ARG NODE_ENV="production"

RUN apt-get update && apt-get -y install build-essential python3 && \
  ln -sf /usr/bin/python3 /usr/bin/python

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/admin/package.json ./apps/admin/package.json
RUN corepack enable && pnpm install --frozen-lockfile --filter ./apps/admin...

# Copy admin source
COPY apps/admin ./apps/admin
COPY packages ./packages
WORKDIR /app/apps/admin

RUN printf '%s\n' "NODE_ENV=${NODE_ENV}" > /app/.env

RUN pnpm run build

FROM nginx:trixie
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=builder /app/apps/admin/dist /var/www

EXPOSE 3002
ENTRYPOINT ["/docker-entrypoint.sh"]
