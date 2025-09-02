# OpenCupid Development Instructions

**ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information in these instructions is incomplete or found to be in error.**

## Project Overview

OpenCupid is a free, open-source matchmaking application built as a Vue 3 + Node.js/Fastify monorepo. The platform enables privacy-preserving, consent-based connections within existing communities.

## Technology Stack

- **Frontend**: Vue 3 + Bootstrap 5 + Vite + TypeScript
- **Backend**: Node.js + Fastify + Prisma ORM + TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Email**: SMTP (MailDev for development)
- **Package Manager**: pnpm (required)
- **Build Tool**: Turbo (monorepo orchestration)
- **Testing**: Vitest (unit tests), Playwright (E2E tests)

## Repository Structure

```
apps/
├── backend/        # Node.js/Fastify API with Prisma ORM
├── frontend/       # Vue 3 + Bootstrap 5 frontend
└── ingress/        # Ingress configuration
packages/
└── shared/         # Shared utilities, Zod schemas, i18n files
```

## Development Setup

**CRITICAL**: Always run these commands in exact order. Each step is required for the application to function properly.

### Prerequisites

Enable pnpm package manager:
```bash
corepack enable
```

### Step-by-Step Setup

1. **Start services** (~11 seconds):
```bash
docker compose up -d
```

2. **Install dependencies** (~19 seconds with --no-frozen-lockfile):
```bash
pnpm install --no-frozen-lockfile
```
**Note**: Use `--no-frozen-lockfile` if you encounter lockfile errors. Ignore peer dependency warnings about sharp versions.

3. **Copy environment configuration**:
```bash
cp .env.example .env
```

4. **Create uploads directory and fix path**:
```bash
mkdir -p uploads
sed -i 's|MEDIA_UPLOAD_DIR=/srv/uploads|MEDIA_UPLOAD_DIR=./uploads|g' .env
```

5. **Load environment variables** (required for all subsequent commands):
```bash
set -a; source .env; set +a
```

6. **Generate Prisma client** (~2.4 seconds):
```bash
pnpm --filter backend prisma:generate
```

7. **Deploy database schema** (~1.6 seconds):
```bash
pnpm --filter backend prisma:deploy
```

8. **Start development servers**:
```bash
pnpm dev
```
**OR start individually**:
```bash
# Backend (port 3000)
pnpm --filter backend dev

# Frontend (port 5173)  
pnpm --filter frontend dev
```

## Build and Test Commands

### Build Process
**NEVER CANCEL**: Build takes 1 minute 36 seconds. Set timeout to 120+ minutes.
```bash
pnpm build
```

### Linting (~4.8 seconds)
```bash
pnpm lint
```

### Type Checking
**NEVER CANCEL**: Takes 1 minute 29 seconds. Set timeout to 90+ minutes.
```bash
pnpm --filter frontend type-check
```

### Unit Tests
**NEVER CANCEL**: Takes 24.7 seconds. Set timeout to 60+ minutes.
```bash
pnpm test
```

### Complete CI Test Suite
**NEVER CANCEL**: Takes 1 minute 35 seconds. Set timeout to 120+ minutes.
```bash
pnpm install && pnpm --filter backend prisma:generate && pnpm lint && pnpm test && pnpm --filter frontend type-check
```

## Validation Requirements

### Manual Testing
**ALWAYS test application functionality after making changes**:

1. **Start both servers**:
```bash
pnpm dev
```

2. **Verify backend** (should respond with 404 JSON):
```bash
curl http://127.0.0.1:3000/
```

3. **Verify frontend** (should serve Vue application):
```bash
curl http://127.0.0.1:5173/
```

4. **Test user flows**: Always test login, profile creation, and basic interactions after making changes to these areas.

### Required Validation Before Committing
**ALWAYS run these commands before committing**:
```bash
pnpm lint
pnpm test
pnpm --filter frontend type-check
```

## Common Issues and Solutions

### Lockfile Issues
If `pnpm install` fails with lockfile errors:
```bash
pnpm install --no-frozen-lockfile
```

### Environment Variables Not Loading
Always source the environment file before running backend commands:
```bash
set -a; source .env; set +a
```

### Upload Directory Permission Error
Ensure uploads directory exists with correct path in .env:
```bash
mkdir -p uploads
sed -i 's|MEDIA_UPLOAD_DIR=/srv/uploads|MEDIA_UPLOAD_DIR=./uploads|g' .env
```

### Database Connection Issues
Verify Docker services are running:
```bash
docker compose ps
```

## Key Development Guidelines

### Backend Changes
- All new configuration variables must be added to `apps/backend/src/lib/appconfig.ts`
- Always add new config to `.env.example` with documentation
- Backend API runs on port 3000
- Database changes require Prisma migrations

### Frontend Changes  
- Follow feature-based directory structure under `apps/frontend/features/`
- No cross-feature imports allowed (enforced by dependency-cruiser)
- Frontend dev server runs on port 5173 with HTTPS
- All UI components use Bootstrap 5 + SCSS

### Shared Code
- Zod schemas and DTOs live in `packages/shared/`
- Internationalization files in `packages/shared/i18n/`
- Never import directly between frontend features

### Testing Requirements
- Add tests in `__tests__` subdirectories closest to modified files
- All new API routes require tests  
- All new frontend components require tests
- Integration tests use real database connections

## Critical Timing Information
**NEVER CANCEL these operations - they take significant time but will complete**:

- **Docker setup**: ~11 seconds
- **pnpm install**: ~19 seconds (with --no-frozen-lockfile)
- **Prisma generate**: ~2.4 seconds  
- **Database deploy**: ~1.6 seconds
- **Build**: 1 minute 36 seconds ⚠️ **SET TIMEOUT 120+ MINUTES**
- **Lint**: ~4.8 seconds
- **Type check**: 1 minute 29 seconds ⚠️ **SET TIMEOUT 90+ MINUTES** 
- **Unit tests**: ~24.7 seconds ⚠️ **SET TIMEOUT 60+ MINUTES**
- **Full CI**: 1 minute 35 seconds ⚠️ **SET TIMEOUT 120+ MINUTES**
- **Playwright install**: ~19.7 seconds
- **Frontend dev start**: ~1.3 seconds
- **Backend dev start**: ~2 seconds

## Debugging Commands

### Database Access
```bash
pnpm --filter backend db:psql
```

### Redis Access  
```bash
pnpm --filter backend redis:sessions
```

### View Docker Logs
```bash
docker compose logs -f
```

### Dependency Analysis
```bash
pnpm --filter frontend dev:depcruise
```
