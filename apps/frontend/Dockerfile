FROM node:22-trixie AS builder
WORKDIR /app
ENV CI=true
ENV PNPM_UPDATE_NOTIFIER=false

RUN apt-get update && apt-get -y install build-essential python3 && \
  ln -sf /usr/bin/python3 /usr/bin/python

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN corepack enable && pnpm install --frozen-lockfile --filter ./apps/frontend...

# Copy frontend source
COPY apps/frontend ./apps/frontend
COPY packages ./packages
WORKDIR /app/apps/frontend

RUN pnpm run build-only

FROM nginx:trixie
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=builder /app/apps/frontend/dist /var/www
COPY apps/frontend/config.template.js /var/www/config.template.js

EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
