# Align Local CI Type-Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the local `ci:test` script and the GitHub Actions CI workflow run identical steps in the same order, so that `vue-tsc` type errors in test fixtures are caught locally before pushing.

**Architecture:** Three config-only changes — CI workflow YAML, root `package.json`, and `CLAUDE.md`. No application code changes. The frontend's `tsconfig.vitest.json` (a TypeScript project reference) already includes test files in vue-tsc scope; we just need explicit, aligned invocations.

**Tech Stack:** GitHub Actions, Turborepo, vue-tsc, pnpm workspaces

---

### Task 1: Add explicit type-check step to CI workflow

**Files:**
- Modify: `.github/workflows/test.yml:40-53`

**Step 1: Make the edit**

In `.github/workflows/test.yml`, after the `Run lint` step and before `Build frontend`, add a new step. Also change the build command from `pnpm build` to `pnpm build-only`.

The file currently reads (lines 40–52):
```yaml
      - name: Run lint
        run: pnpm lint
      # - name: Initialize test database
      #   run: pnpm --filter backend exec npx prisma db push
      #   env:
      #     DATABASE_URL: postgresql://appuser:secret@localhost:5432/app_test
      - name: Build frontend
        run: pnpm --filter frontend exec pnpm build
      - name: Backend tests
        run: pnpm --filter backend exec vitest run
      - name: Frontend unit tests
        run: pnpm --filter frontend exec vitest run
      - name: Check i18n keys
        run: pnpm i18n:check && pnpm i18n:check:api
```

Replace those lines with:
```yaml
      - name: Run lint
        run: pnpm lint
      - name: Type check
        if: github.event_name == 'pull_request'
        run: turbo run type-check --concurrency 1
      # - name: Initialize test database
      #   run: pnpm --filter backend exec npx prisma db push
      #   env:
      #     DATABASE_URL: postgresql://appuser:secret@localhost:5432/app_test
      - name: Build frontend
        run: pnpm --filter frontend exec pnpm build-only
      - name: Backend tests
        run: pnpm --filter backend exec vitest run
      - name: Frontend unit tests
        run: pnpm --filter frontend exec vitest run
      - name: Check i18n keys
        run: pnpm i18n:check && pnpm i18n:check:api
```

Key points:
- `if: github.event_name == 'pull_request'` — type-check only runs on PRs, not on push to main (already validated during the PR)
- `build-only` uses the existing `"build-only": "vite build"` script in `apps/frontend/package.json` — vite build only, no redundant vue-tsc

**Step 2: Verify the YAML is valid**

```bash
cat .github/workflows/test.yml
```
Check indentation is consistent (2-space YAML). No tabs.

**Step 3: Commit**

```bash
git checkout -b chore/align-ci-type-check
git add .github/workflows/test.yml
git commit -m "ci: add explicit type-check step, use build-only for frontend build"
```

---

### Task 2: Align `ci:test` script in root `package.json`

**Files:**
- Modify: `package.json:23`

**Step 1: Make the edit**

The current `ci:test` script (line 23):
```json
"ci:test": "pnpm install && pnpm --filter backend prisma:generate && pnpm lint && pnpm test && turbo run type-check --concurrency 1 && pnpm i18n:check && pnpm i18n:check:api",
```

Replace with (mirroring CI steps exactly, in CI order):
```json
"ci:test": "pnpm install && pnpm --filter backend prisma:generate && pnpm lint && turbo run type-check --concurrency 1 && pnpm --filter frontend exec pnpm build-only && pnpm --filter backend exec vitest run && pnpm --filter frontend exec vitest run && pnpm i18n:check && pnpm i18n:check:api",
```

Changes vs old script:
- `turbo run type-check` moves BEFORE tests (matches CI order)
- `pnpm test` (turbo parallel) replaced by `pnpm --filter backend exec vitest run && pnpm --filter frontend exec vitest run` (matches CI exactly)
- `pnpm --filter frontend exec pnpm build-only` added (validates frontend builds, same as CI)

**Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
```
Expected: `valid`

**Step 3: Smoke-test the script parses correctly**

```bash
node -e "const p=require('./package.json'); console.log(p.scripts['ci:test'])"
```
Expected: prints the full command string without errors.

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: align ci:test script to mirror CI steps exactly"
```

---

### Task 3: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update the Tests section**

Find the block (lines 104–120):
```markdown
Full CI suite (install, prisma generate, lint, test, type-check). This is expensive to run and takes a long time, run this only near/after completing a task and when `pnpm test` and `pnpm lint` are green.

```bash
pnpm run ci:test
```

Run with coverage:

```bash
pnpm run test:coverage
```

Run build and type check:

```bash
pnpm build
```
```

Replace with:
```markdown
Type-check only (vue-tsc across all packages including test files):

```bash
turbo run type-check --concurrency 1
```

Full CI suite — mirrors GitHub Actions exactly (install, prisma generate, lint, type-check, build, tests, i18n). Run this before finalizing a PR and when `pnpm test` and `pnpm lint` are green:

```bash
pnpm run ci:test
```

Run with coverage:

```bash
pnpm run test:coverage
```
```

Note: remove the `pnpm build` entry — it was misdocumented as "run build and type check" but the type-check is now an explicit separate step.

**Step 2: Update the CI workflow section**

Find the PR finalization block (lines 173–191) and add a note about running type-check locally before push. After the line:

```markdown
Always work in a feature branch and open a Github pull request once task is complete and tests succeed.
```

The git workflow block currently ends at the `gh pr create` line. Update it to:

```bash
git checkout -b your-branch-name
# ... make changes, commit ...
pnpm test                              # MUST pass before push
turbo run type-check --concurrency 1  # MUST pass before finalizing PR
git push -u origin your-branch-name
gh pr create
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document type-check command and add to PR finalization workflow"
```

---

### Task 4: Create changeset and open PR

**Step 1: Write changeset**

This change has no service version bump (CI config only, no deployable artifact changes). Skip the changeset — it's infra/tooling only, not a versioned service change.

**Step 2: Open PR**

```bash
git push -u origin chore/align-ci-type-check
gh pr create \
  --title "ci: explicit type-check step, align local ci:test with GitHub Actions" \
  --body "$(cat <<'EOF'
## Summary
- Adds explicit `Type check` step to CI (`turbo run type-check --concurrency 1`), gated to PR events only (skipped on push to main)
- Changes CI frontend build from `pnpm build` (which implicitly ran vue-tsc) to `pnpm build-only` (vite only — type-check is now its own step)
- Rewrites `ci:test` script to mirror CI steps exactly, in the same order
- Updates CLAUDE.md to document the type-check command and add it to the PR finalization workflow

## Why
`vue-tsc` type-checks test fixtures via `tsconfig.vitest.json` (a TypeScript project reference). Vitest just transpiles without type-checking, so partial/mistyped test objects pass locally but fail CI's vue-tsc step. Making type-check explicit and identical locally prevents the push→CI roundtrip to discover these errors.

## Test plan
- [ ] Open a PR with this change and verify the "Type check" step appears in GitHub Actions
- [ ] Verify "Type check" does NOT appear in the push-to-main run
- [ ] Run `pnpm run ci:test` locally and verify it completes without errors
- [ ] Introduce a deliberate type error in a test file, run `turbo run type-check --concurrency 1`, confirm it fails

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Watch CI in background**

```bash
gh run list --limit 1
gh run watch --exit-status
```

---

## Verification Checklist

After implementation:
- [ ] `turbo run type-check --concurrency 1` runs successfully from repo root
- [ ] `pnpm run ci:test` runs the same steps as `.github/workflows/test.yml` in the same order
- [ ] CI "Type check" step appears only on pull_request events (not on push)
- [ ] CI "Build frontend" step uses `build-only` (vite only, no vue-tsc)
- [ ] CLAUDE.md documents `turbo run type-check --concurrency 1` as the type-check command
- [ ] CLAUDE.md PR finalization workflow includes the type-check step
