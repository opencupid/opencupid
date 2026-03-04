FROM node:22-bookworm AS builder

WORKDIR /app
ENV CI=true
ENV PNPM_UPDATE_NOTIFIER=false

RUN apt-get update && apt-get -y install build-essential python3 && \
  ln -sf /usr/bin/python3 /usr/bin/python

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY apps/backend ./apps/backend
COPY packages ./packages

WORKDIR /app/apps/backend

RUN pnpm install --no-frozen-lockfile
# Optional: for native Prisma CLI if needed
# RUN apk add --no-cache libc6-compat

# Generate Prisma client and build application
ENV PRISMA_DISABLE_WARNINGS=true
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
ENV TURBO_NO_UPDATE_NOTIFIER=1
RUN pnpm run prisma:generate && pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod

FROM node:22-bookworm
LABEL org.opencontainers.image.source=https://github.com/opencupid/opencupid

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app .

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["node", "dist/main.js"]
