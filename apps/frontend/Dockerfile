FROM node:22-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get -y install build-essential python3 && \
  ln -sf /usr/bin/python3 /usr/bin/python

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY .env ./
RUN corepack enable && pnpm install --frozen-lockfile --filter ./apps/frontend...

# Copy frontend source
COPY apps/frontend ./apps/frontend
COPY packages ./packages
WORKDIR /app/apps/frontend

RUN pnpm run build-only

FROM nginx:bookworm
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /var/www

EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
