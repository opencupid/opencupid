# Admin moderation — design

**Status:** approved (brainstorm), pending implementation plan
**Date:** 2026-04-25
**Follows up on:** PR #1368 (profile-trust quarantine)

## Goal

Expose the profile-trust quarantine system (introduced in PR #1368) to administrators through the admin GUI. Admins must be able to:

1. See which profiles are currently flagged (and optionally, which were flagged historically).
2. Manually quarantine a profile (apply `PROFILE_UNVETTED` indefinitely).
3. Manually clear an admin-set quarantine flag.

Heuristic-set flags (`PROFILE_UNVETTED` from `system:profile_create`, `SPAM_BURST` from `heuristic:spam_burst`) remain visible but read-only from the admin UI — they are owned by the convergence machinery and clearing them by hand would risk undoing decisions the admin doesn't fully understand.

## Non-goals

- Manual `SPAM_BURST` flagging. The semantics (DISCARD active conversations) are destructive and don't compose cleanly with the convergence model. Out of scope.
- Per-admin identity. The admin route is gated by an `x-admin-authenticated` header set by an mTLS proxy; there is no per-admin user record. `flaggedBy`/`clearedBy` records `admin:manual` as a sentinel.
- Bulk operations on flags (clear-many, flag-many). Single-flag operations only.

## Architectural decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Full CRUD on flags from admin UI | Listing alone wouldn't satisfy operational needs (false-positive `SPAM_BURST` recovery, manual quarantine of suspicious accounts). |
| 2 | Add `clearedBy String?` to `ProfileTrustFlag` | Symmetry with `flaggedBy`. Lets queries answer "who cleared this?" without log scraping, and turns the `flaggedBy LIKE 'admin:%'` worker filter (decision 4) into a query against deliberately-structured data, not parsed free text. |
| 3 | "Active only" by default, "Include cleared" toggle | Default view matches the brief ("currently flagged"). Toggle preserves audit trail without fragmenting the page into tabs. |
| 4 | Reuse `PROFILE_UNVETTED` for manual flags; workers filter on `flaggedBy: { not: { startsWith: 'admin:' } }` | Smaller surface area than adding an `ADMIN_QUARANTINE` enum value. The codebase has zero exhaustive switches on `TrustReason`, so the type-safety win of a new enum value is currently theoretical. With `clearedBy` (decision 2) the prefix convention is structured, not brittle. |
| 5 | Quarantine action lives in the ProfilesPage detail modal, not the row | The row is already crowded (10 columns). Detail modal is the natural place for per-profile actions. Rows get a `table-warning` class to signal "this profile has an active flag" at scan time. |
| 6 | Admin-clear is allowed only on admin-set flags | Heuristic flags are read-only from the admin UI. Prevents accidental undoing of convergence-driven decisions. Clearing a `SPAM_BURST` would also semantically need to revive `DISCARDED` conversations — out of scope. |

## Schema change

```prisma
model ProfileTrustFlag {
  id        String      @id @default(cuid())
  profileId String
  reason    TrustReason
  flaggedAt DateTime    @default(now())
  clearedAt DateTime?
  clearedBy String?     // NEW
  evidence  Json
  flaggedBy String

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, clearedAt])
}
```

Migration: add `clearedBy TEXT NULL`. No backfill — pre-existing cleared rows stay null. New auto-clears must populate it (see "Existing call site updates").

### `flaggedBy` / `clearedBy` value conventions

| Source | `flaggedBy` | `clearedBy` |
| --- | --- | --- |
| Profile creation (auto-quarantine) | `system:profile_create` | — |
| Heuristic SPAM_BURST detection | `heuristic:spam_burst` | — |
| `clear-unvetted-window` worker | — | `system:unvetted_window` |
| `reconcileSpamBurst` (count below threshold) | — | `heuristic:spam_burst_below_threshold` |
| Admin manual flag | `admin:manual` | — |
| Admin manual clear | — | `admin:manual` |

The `admin:` prefix is load-bearing: the unvetted-window worker filters on it.

## Existing call site updates

Three pre-existing sites are touched:

1. [`apps/backend/src/workers/profileTrustWorker.ts:51`](../../apps/backend/src/workers/profileTrustWorker.ts#L51) — populate `clearedBy: 'system:unvetted_window'` on auto-clear.
2. [`apps/backend/src/services/profileTrust.service.ts:106-110`](../../apps/backend/src/services/profileTrust.service.ts#L106-L110) — populate `clearedBy: 'heuristic:spam_burst_below_threshold'` on threshold-down clear.
3. [`apps/backend/src/workers/profileTrustWorker.ts:28`](../../apps/backend/src/workers/profileTrustWorker.ts#L28) — add `flaggedBy: { not: { startsWith: 'admin:' } }` to the unvetted-window query so admin-set `PROFILE_UNVETTED` flags are immune to 24h auto-clear.

Forgetting (1) or (2) would leave nulls in `clearedBy` for new auto-clears, which would defeat the audit point. `reconcileSpamBurst` does not need a worker-side filter change: manual flags only ever use `PROFILE_UNVETTED`, never `SPAM_BURST`, so the reconcile function (which filters on `reason: 'SPAM_BURST'`) never sees them.

## Service methods (new)

Added to [`ProfileTrustService`](../../apps/backend/src/services/profileTrust.service.ts):

```ts
listTrustFlags(opts: {
  activeOnly?: boolean      // default true
  reason?: TrustReasonType  // optional reason filter
  page: number
  pageSize: number
}): Promise<{ flags: TrustFlagRow[]; total: number }>
// returns flags joined with profile { id, publicName, country, cityName }
// orders by flaggedAt DESC

clearFlag(flagId: string, clearedBy: string): Promise<void>
// validates: flag is currently active (clearedAt IS NULL) and flaggedBy LIKE 'admin:%'
// writes clearedAt + clearedBy
// enqueues promote-pendings for the profile (reuses the existing dedup jobId helper)
// throws ClearFlagError on validation failure (404 if missing, 409 if non-admin or already cleared)

flagProfile(profileId: string, note: string, flaggedBy: string): Promise<ProfileTrustFlag>
// idempotent: if an active flag with flaggedBy LIKE 'admin:%' exists for the profile, returns it unchanged
// otherwise writes ProfileTrustFlag {
//   reason: 'PROFILE_UNVETTED',
//   flaggedBy,
//   evidence: { note }
// }
// note: a heuristic flag may already be active; the admin flag is written alongside it
```

Reusing the existing `promote-pendings` enqueue (via `promotePendingsJobId(profileId)`) keeps a single code path for the "flag-cleared → release held messages" flow. The serializable transaction in `promotePendingsIfClear` already handles the case where another flag is still active (`stillFlagged` short-circuit).

## API endpoints (new)

Added under [`apps/backend/src/api/routes/admin.route.ts`](../../apps/backend/src/api/routes/admin.route.ts), behind the existing `x-admin-authenticated` guard.

| Method | Path | Body / Query | Response |
| --- | --- | --- | --- |
| `GET` | `/admin/trust-flags` | `?activeOnly=true&reason=&page=1&pageSize=25` | `{ success, flags, total, page, pageSize }` |
| `POST` | `/admin/trust-flags/:id/clear` | — | `{ success }` |
| `POST` | `/admin/profiles/:id/flag` | `{ note: string }` | `{ success, flag }` |

`POST /flag` validates `note` is non-empty (max 1000 chars) — surfaces in `evidence.note` for forensic review.

### Modified endpoint

`GET /admin/profiles` adds `hasActiveTrustFlag: boolean` to each profile row. Implementation: `_count` of `trustFlags` where `clearedAt: null`, mapped to a boolean. Cheap (single index lookup per row).

## Admin frontend

### New: ModerationPage

Route: `/moderation`. File: `apps/admin/src/pages/ModerationPage.vue`.

Follows the established admin page template (search / filter / paginated table / detail modal — same shape as ProfilesPage):

**Filters:**

- Reason dropdown (All / `PROFILE_UNVETTED` / `SPAM_BURST`)
- "Include cleared" checkbox (off by default)

**Columns:**

- Profile (publicName + id, click → routes to `/profiles?profileId={id}` which opens the existing detail modal — avoids duplicating the modal component)
- Reason (badge with source-derived variant: distinct visual treatment for `system:`, `heuristic:`, `admin:` based on `flaggedBy` prefix; specific colors are an implementation choice)
- FlaggedBy (raw string)
- FlaggedAt (relative + absolute on hover)
- Status (Active / Cleared with `clearedAt` and `clearedBy`)
- Evidence (compact summary; for SPAM_BURST shows `countAtFlagTime`; for admin shows `note` truncated)
- Actions (per-row "Clear" button, shown only when `clearedAt IS NULL` AND `flaggedBy LIKE 'admin:%'`)

**Default sort:** `flaggedAt DESC`.

**Pagination:** infinite scroll with intersection-observer sentinel (matches ProfilesPage).

**Clear flow:** click "Clear" → confirm modal ("Clear quarantine for {profile}?") → `POST /admin/trust-flags/:id/clear` → row re-renders as cleared (or disappears if "Include cleared" is off).

### Modified: ProfilesPage

1. Add `hasActiveTrustFlag: boolean` to the `AdminProfile` interface.
2. Apply `class="table-warning"` to `<tr>` when `hasActiveTrustFlag` is true.
3. Detail modal gains a **Trust** section above the closing footer:
   - If profile has active flags, show each: `Reason / FlaggedBy / FlaggedAt / Evidence (compact)`.
   - If no active flag, render the "Quarantine" affordance.
4. Detail modal footer actions:
   - Profile has **no** active flag → "Quarantine" button (left side of footer, separated from "Close"). Click expands an inline note textarea + "Confirm" / "Cancel" buttons. Confirm posts to `POST /admin/profiles/:id/flag`. On success, modal updates to show the new flag.
   - Profile has an active **admin** flag (any flag with `flaggedBy LIKE 'admin:%'`) → "Clear quarantine" button. Confirm dialog → `POST /admin/trust-flags/:id/clear` (using the admin flag's id). On success, modal re-renders without the cleared flag.
   - Profile has only active **system/heuristic** flags → display only, no clear button.

### Modified: App.vue

Add a "Moderation" sidebar entry between "Profiles" and "Tags".

## Tests

### Backend

- **Service** (`profileTrust.service.spec.ts`):
  - `listTrustFlags` returns active by default, includes cleared when `activeOnly: false`, filters by reason.
  - `clearFlag` writes `clearedAt` and `clearedBy`, enqueues promote-pendings, refuses non-admin flags (409), refuses already-cleared (409), 404 on unknown id.
  - `flagProfile` writes a flag with `evidence.note` and `flaggedBy: 'admin:manual'`; idempotent on second call (returns existing); coexists with a system flag.
- **Worker** (`profileTrustWorker.spec.ts`):
  - `clear-unvetted-window` skips flags with `flaggedBy LIKE 'admin:%'` (admin-set flags are not auto-cleared at 24h).
  - Auto-clear sites populate `clearedBy` correctly.
- **Routes** (`admin.route.spec.ts`):
  - All three new endpoints reject when `x-admin-authenticated` header is missing.
  - `GET /admin/trust-flags` happy path + filters.
  - `POST /admin/trust-flags/:id/clear` happy path + 409 on heuristic flag.
  - `POST /admin/profiles/:id/flag` happy path + idempotency + 400 on missing/empty note.
  - `GET /admin/profiles` includes `hasActiveTrustFlag` field.

### Frontend (admin)

- `ModerationPage.spec.ts`: renders rows, applies "Include cleared" toggle, action button only on admin rows, clear flow calls API and updates row.
- `ProfilesPage.spec.ts`: row gets `table-warning` class when `hasActiveTrustFlag`, detail modal shows Trust section, Quarantine flow posts and re-renders, Clear flow posts and re-renders.

## Out of scope (explicit)

- Per-admin identity / audit log of who-did-what (deferred — `admin:manual` sentinel is sufficient until per-admin auth is added).
- Bulk operations.
- Manual `SPAM_BURST` flagging.
- Admin-driven clear of heuristic flags.
- A new `ADMIN_QUARANTINE` enum value (revisit if exhaustive switches on `TrustReason` start appearing in the codebase — at that point the type-safety case becomes concrete).
