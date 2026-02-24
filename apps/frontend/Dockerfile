FROM node:22-bookworm AS builder
WORKDIR /app

# Build-time variables for HTML meta injection only.
# Runtime config (API_BASE_URL, SENTRY_DSN, etc.) is injected at container
# startup via docker-entrypoint.sh — no rebuild needed to change them.
ARG NODE_ENV="production"
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

# Generate a minimal .env with only the build-time variables needed for
# MetaInjectPlugin (OG tags, SITE_NAME). Runtime config vars are no longer
# baked into the JS bundle.
RUN printf '%s\n' \
  "NODE_ENV=${NODE_ENV}" \
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
COPY apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=builder /app/apps/frontend/dist /var/www

EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
