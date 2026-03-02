# Tolgee TMS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a self-hosted Tolgee instance to the local dev environment as a translation management UI with CLI push/pull workflow for `packages/shared/i18n/` JSON files.

**Architecture:** Tolgee runs as a Docker Compose service (dev-only). The Tolgee CLI syncs local JSON files to/from the Tolgee server. Zero frontend code changes — vue-i18n and all existing components are untouched.

**Tech Stack:** Tolgee (Docker image `tolgee/tolgee`), `@tolgee/cli`, pnpm workspaces, Docker Compose

---

### Task 1: Create GitHub issue

**Files:** none

**Step 1: Create the issue**

```bash
gh issue create \
  --title "feat: add Tolgee TMS for translation management" \
  --body "$(cat <<'EOF'
## Summary

Add a self-hosted [Tolgee](https://tolgee.io) instance to the local dev environment as a translation management UI.

## Motivation

Currently, translating strings requires editing JSON files manually. Tolgee provides a web UI for managing translations, and a CLI for push/pull workflows to keep local JSON files in sync.

## Scope

- Add `tolgee` + `tolgee-db` services to `docker-compose.yml` (dev-only)
- Install `@tolgee/cli` as root devDependency
- Add `.tolgeerc.yml` config at repo root
- Add `pnpm tolgee:push` / `pnpm tolgee:pull` scripts
- Commit `.env.development.local` with dev API key placeholder
- Document workflow in `CLAUDE.md`

## Out of scope

- In-context editing (`@tolgee/vue`) — not part of this change
- Admin app i18n
- Production deployment of Tolgee
EOF
)"
```

Note the issue number from the output (e.g. `#123`) — you'll use it in the changeset.

**Step 2: Commit**

```bash
git commit --allow-empty -m "chore: start tolgee TMS integration (#<issue-number>)"
```

---

### Task 2: Add Tolgee services to `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add `tolgee-db` and `tolgee` services**

Open `docker-compose.yml`. After the `redis` service block (line ~26) and before `jitsi-web`, insert:

```yaml
  tolgee-db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: tolgee
      POSTGRES_USER: tolgee
      POSTGRES_PASSWORD: tolgee
    volumes:
      - tolgee_postgres_data:/var/lib/postgresql/data

  tolgee:
    image: tolgee/tolgee
    restart: unless-stopped
    ports:
      - '8085:8080'
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://tolgee-db:5432/tolgee
      SPRING_DATASOURCE_USERNAME: tolgee
      SPRING_DATASOURCE_PASSWORD: tolgee
      TOLGEE_AUTHENTICATION_INITIAL_USERNAME: admin
      TOLGEE_AUTHENTICATION_INITIAL_PASSWORD: admin
    volumes:
      - tolgee_data:/data
    depends_on:
      - tolgee-db
```

Also add the two new named volumes to the `volumes:` section at the bottom of the file:

```yaml
  tolgee_postgres_data:
  tolgee_data:
```

**Step 2: Verify syntax**

```bash
docker compose config --quiet
```

Expected: no output (silent = valid).

**Step 3: Smoke-test the new services**

```bash
docker compose up -d tolgee-db tolgee
docker compose logs tolgee --tail=30
```

Expected: Tolgee logs show `Started TolgeeApplication` (may take 20–30 s). Open `http://localhost:8085` in a browser — you should see the Tolgee login screen.

**Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add Tolgee TMS services to docker-compose"
```

---

### Task 3: Install `@tolgee/cli` and add pnpm scripts

**Files:**
- Modify: `package.json` (root)

**Step 1: Install the CLI**

```bash
pnpm add -D -w @tolgee/cli
```

**Step 2: Add scripts**

Open root `package.json`. In the `"scripts"` object, add after `"changeset:status"`:

```json
"tolgee:push": "tolgee push",
"tolgee:pull": "tolgee pull"
```

**Step 3: Verify CLI is available**

```bash
pnpm tolgee --version
```

Expected: prints a version string (e.g. `2.x.x`).

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @tolgee/cli and push/pull scripts"
```

---

### Task 4: Add `.tolgeerc.yml` config

**Files:**
- Create: `.tolgeerc.yml`

**Step 1: Create the config file**

```yaml
# Tolgee CLI configuration — dev environment
# Docs: https://tolgee.io/tolgee-cli/project-configuration
apiUrl: http://localhost:8085
projectId: 1
files:
  - path: packages/shared/i18n/{language}.json
    language: '{language}'
  - path: packages/shared/i18n/api/{language}.json
    language: '{language}'
    namespace: api
```

`TOLGEE_API_KEY` is read automatically from the environment (set in `.env.development.local` in Task 5).

**Step 2: Commit**

```bash
git add .tolgeerc.yml
git commit -m "chore: add .tolgeerc.yml for Tolgee CLI"
```

---

### Task 5: Add `.env.development.local`

**Files:**
- Create: `.env.development.local`

**Step 1: First-time Tolgee setup (manual)**

This step is a one-time interactive action (not scripted):

1. Open `http://localhost:8085`
2. Log in as `admin` / `admin`
3. Create a new project named `opencupid` — Tolgee will assign it `projectId: 1`
4. Go to **Project settings → API keys → Add API key**
5. Copy the generated key (starts with `tgpak_`)

**Step 2: Create `.env.development.local`**

```bash
cat > .env.development.local << 'EOF'
# Tolgee CLI API key — dev only, points to localhost:8085
# Generate at http://localhost:8085 → Project settings → API keys
TOLGEE_API_KEY=tgpak_replace_with_your_key
EOF
```

Replace `tgpak_replace_with_your_key` with the real key from Step 1.

**Step 3: Confirm `.env.development.local` is NOT in `.gitignore`**

```bash
git check-ignore -v .env.development.local
```

Expected: no output (file is not ignored — correct, we commit it).

**Step 4: Commit**

```bash
git add .env.development.local
git commit -m "chore: add .env.development.local with Tolgee dev API key"
```

---

### Task 6: Seed Tolgee with existing translations

**Files:** none (data operation)

**Step 1: Push local JSON to Tolgee**

```bash
pnpm tolgee:push
```

Expected: CLI confirms keys imported for both the default namespace and the `api` namespace.

**Step 2: Verify in the UI**

Open `http://localhost:8085`, navigate to the project → **Translations**. You should see all keys from `en.json` and `api/en.json` listed with English and Hungarian values.

---

### Task 7: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add Tolgee to the Local URLs table**

Find the `### Local URLs` table and add a row:

```markdown
| Tolgee (translation UI) | <http://localhost:8085>                |
```

**Step 2: Add Tolgee section**

After the MailDev paragraph and before `## Project structure`, insert:

```markdown
### Tolgee (translation management)

Tolgee provides a web UI for managing translation strings and a CLI for syncing them to/from the local JSON files in `packages/shared/i18n/`.

**First-time setup** (after `docker compose up`):
1. Open <http://localhost:8085> and log in as `admin` / `admin`
2. Create a project named `opencupid`
3. Go to **Project settings → API keys → Add API key** and copy the key
4. Paste it as `TOLGEE_API_KEY` in `.env.development.local`
5. Run `pnpm tolgee:push` to seed Tolgee with the current strings

**Push/pull workflow:**

```bash
pnpm tolgee:push   # upload local JSON → Tolgee (after adding new keys in code)
pnpm tolgee:pull   # download translated JSON ← Tolgee (after translating in UI)
```

Translated JSON files live in `packages/shared/i18n/`. Commit them after pulling.
\```
```

(Remove the extra backslash from the closing fence — it's only here to avoid breaking this document.)

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Tolgee TMS workflow in CLAUDE.md"
```

---

### Task 8: Changeset and PR

**Files:**
- Create: `.changeset/<adjective-noun-verb>.md`

**Step 1: Write the changeset**

Pick three random kebab-case words for the filename (e.g. `silver-tolgee-bloom.md`):

```bash
cat > .changeset/silver-tolgee-bloom.md << 'EOF'
---
'@opencupid/frontend': patch
---

Add Tolgee self-hosted TMS for translation management with CLI push/pull workflow (#<issue-number>)
EOF
```

Replace `<issue-number>` with the actual issue number from Task 1.

**Step 2: Commit**

```bash
git add .changeset/
git commit -m "chore: add changeset for Tolgee TMS integration"
```

**Step 3: Push and open PR**

```bash
git push -u origin feat/tolgee-tms
gh pr create \
  --title "feat: add Tolgee TMS for translation management" \
  --body "$(cat <<'EOF'
## Summary

- Adds `tolgee` + `tolgee-db` Docker Compose services (dev-only, port 8085)
- Installs `@tolgee/cli` with `pnpm tolgee:push` / `pnpm tolgee:pull` scripts
- Adds `.tolgeerc.yml` mapping both `i18n/` namespaces to the local server
- Commits `.env.development.local` with dev-only Tolgee API key
- Documents first-time setup and workflow in `CLAUDE.md`

## Test plan

- [ ] `docker compose up -d tolgee tolgee-db` starts cleanly; UI loads at http://localhost:8085
- [ ] `pnpm tolgee:push` imports all keys from `en.json` and `api/en.json`
- [ ] `pnpm tolgee:pull` writes translated JSON back to disk without corruption
- [ ] `docker compose config --quiet` passes (valid YAML)
- [ ] Existing frontend, backend and i18n CI checks still pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
