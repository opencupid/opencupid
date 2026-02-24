FROM node:22-bookworm AS builder
WORKDIR /app

ARG API_BASE_URL="/api"

RUN apt-get update && apt-get -y install build-essential python3 && \
  ln -sf /usr/bin/python3 /usr/bin/python

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin/package.json ./apps/admin/package.json
RUN corepack enable && pnpm install --frozen-lockfile --filter ./apps/admin...

# Copy admin source and shared packages
COPY apps/admin ./apps/admin
COPY packages ./packages
WORKDIR /app/apps/admin

RUN printf '%s\n' \
  "API_BASE_URL=${API_BASE_URL}" \
  > /app/.env

RUN pnpm run build

FROM nginx:bookworm
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /var/www

EXPOSE 3002
CMD ["nginx", "-g", "daemon off;"]
