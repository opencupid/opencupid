FROM node:22-alpine AS builder
WORKDIR /app

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY .env ./apps/frontend/.env
RUN corepack enable && pnpm install --frozen-lockfile --filter ./apps/frontend...

# Copy frontend source
COPY apps/frontend ./apps/frontend
COPY packages ./packages
WORKDIR /app/apps/frontend

RUN pnpm run build-only

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /var/www

EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
