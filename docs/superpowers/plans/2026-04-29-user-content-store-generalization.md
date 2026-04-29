# UserContent Frontend Store Generalization Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Extract a `useUserContentActions` composable from `postStore.ts`; convert the store to setup-syntax; preserve every public store property/action name so consumers compile unchanged.

**Architecture:** A generic composable `useUserContentActions(state, config)` accepts refs (state arrays, current item) plus a config object (basePath, schemas, endpoints, resourceLabel) and returns the standard CRUD/fetch action set. The refactored `postStore.ts` becomes a setup-syntax store that owns its state refs, calls the composable to get generic actions, and re-exports them under their existing public names plus its post-specific getters and `loadPosts` scope dispatcher.

**Tech Stack:** Vue 3 Composition API, Pinia (setup syntax), Zod, axios.

**Branch:** `refactor/user-content-store-generalization` (stacked on top of PR 1 — `refactor/user-content-backend-abstraction`).
**Worktree:** `.worktrees/user-content-store-generalization`.

---

## Out of scope (deferred)

- Event content type frontend store (PR 3)
- Components / composables consuming postStore (no changes; we preserve public surface exactly)
- Refactoring `usePostListViewModel`

---

## Public surface (must remain identical)

State: `posts`, `myPosts`, `postSummaries`, `currentPost`
Getters: `getPostsByType(type)`, `getOffers`, `getRequests`
Actions: `createPost`, `updatePost`, `deletePost`, `setPostVisibility`, `hidePost`, `showPost`, `loadPosts`, `fetchOwnerPost`, `fetchPublicPost`, `fetchPosts`, `fetchNearbyPosts`, `fetchRecentPosts`, `fetchMyPosts`, `fetchPostsInBounds`, `upsertPost`, `clearPosts`, `clearMyPosts`, `setCurrentPost`

Wire response keys are `{success, post}` and `{success, posts}` — the composable accepts a `wire.singular` / `wire.plural` config so it knows how to read them.

---

## Task 0: Verify baseline

- [ ] **Step 1:** Confirm worktree and branch.
```bash
git rev-parse --abbrev-ref HEAD
```
Expected: `refactor/user-content-store-generalization`

- [ ] **Step 2:** Confirm postStore tests pass (existing baseline).
```bash
pnpm --filter frontend exec vitest run src/features/posts/stores/__tests__/postStore.spec.ts
```
Expected: all green.

---

## Task 1: Create `useUserContentActions` composable

**Files:**
- Create: `apps/frontend/src/store/composables/useUserContentActions.ts`

The composable is a plain function (not a Pinia store). It takes:
- `state` — refs the store owns (items, myItems, summaries, currentItem)
- `config` — basePath, schemas, endpoints, resourceLabel, wire keys

Returns: `create`, `update`, `deleteItem`, `setVisibility`, `hide`, `show`, `fetchList`, `fetchMine`, `fetchNearby`, `fetchRecent`, `fetchInBounds`, `fetchOwner`, `fetchPublic`, `upsertItem`, `clearItems`, `clearMyItems`, `setCurrentItem`.

Wire response key reading: extract item via `data[config.wire.singular]`, list via `data[config.wire.plural]`.

- [ ] **Step 1:** Write the file. (Full code below in implementation notes.)
- [ ] **Step 2:** Type-check. Expected 0 errors.
- [ ] **Step 3:** Commit.

---

## Task 2: Refactor `postStore.ts` to setup syntax + composable

**Files:**
- Modify: `apps/frontend/src/features/posts/stores/postStore.ts`

The setup store:
1. Declares `items`, `myItems`, `summaries`, `currentItem` refs
2. Calls `useUserContentActions(state, postConfig)` to get the generic actions
3. Adds post-specific getters (`getPostsByType`, `getOffers`, `getRequests`)
4. Adds post-specific dispatcher (`loadPosts`)
5. Returns everything aliased to the existing public surface (e.g. `posts: items`, `createPost: a.create`)

- [ ] **Step 1:** Replace file contents.
- [ ] **Step 2:** Run postStore tests.
```bash
pnpm --filter frontend exec vitest run src/features/posts/stores/__tests__/postStore.spec.ts
```
- [ ] **Step 3:** Run full frontend tests.
```bash
pnpm --filter frontend test
```
- [ ] **Step 4:** Type-check.
- [ ] **Step 5:** Commit.

---

## Task 3: Format, lint, ci:test, changeset, PR

- [ ] Format only the new/modified files.
- [ ] `pnpm lint` green.
- [ ] `pnpm run ci:test` green.
- [ ] Add changeset (`@opencupid/frontend: minor`).
- [ ] Push branch (target = base branch from PR 1, since this is stacked).
- [ ] Open PR with base = `refactor/user-content-backend-abstraction`.
