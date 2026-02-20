FROM node:22-bookworm AS builder
WORKDIR /app

# Build-time variables embedded into the frontend bundle by Vite.
# None of these are secrets — they are safe to appear in image layers.
ARG API_BASE_URL="/api"
ARG WS_BASE_URL="/ws"
ARG IMAGE_URL_BASE="/images"
ARG NODE_ENV="production"
ARG VAPID_PUBLIC_KEY=""
ARG SENTRY_DSN=""
ARG SITE_NAME="OpenCupid"
ARG OG_TITLE="OpenCupid"
ARG OG_DESCRIPTION="OpenCupid is an open-source dating platform."
ARG OG_IMAGE=""
ARG OG_URL=""
ARG OG_TYPE="website"

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

# Generate a minimal .env with only the non-secret build-time variables.
# This replaces the previous `COPY .env ./` which leaked all production secrets
# into the Docker build cache.
RUN printf '%s\n' \
  "API_BASE_URL=${API_BASE_URL}" \
  "WS_BASE_URL=${WS_BASE_URL}" \
  "IMAGE_URL_BASE=${IMAGE_URL_BASE}" \
  "NODE_ENV=${NODE_ENV}" \
  "VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}" \
  "SENTRY_DSN=${SENTRY_DSN}" \
  "SITE_NAME=${SITE_NAME}" \
  "OG_TITLE=${OG_TITLE}" \
  "OG_DESCRIPTION=${OG_DESCRIPTION}" \
  "OG_IMAGE=${OG_IMAGE}" \
  "OG_URL=${OG_URL}" \
  "OG_TYPE=${OG_TYPE}" \
  > /app/.env

RUN pnpm run build-only

FROM nginx:bookworm
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /var/www

EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
