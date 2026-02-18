---
name: create-migration
description: Guide creation of a safe Prisma database migration. Use when the user wants to add, modify, or remove database schema fields, tables, or relations. Walks through the full checklist to prevent data-loss and broken builds.
---

# Create Prisma Migration

Follow these steps in order. Do not skip steps.

## 1. Understand the change
- Ask what schema change is needed if not already specified
- Identify the affected model(s) in `apps/backend/prisma/schema.prisma`

## 2. Check for destructive operations
Before writing anything, flag these as HIGH RISK and confirm with the user:
- Dropping a column (`@@map` removals, field deletions)
- Renaming a column (data loss unless handled with `@map`)
- Changing a field from optional to required on a populated table
- Changing a field type (e.g. String → Int)

For renames: use `@map("old_name")` to preserve data instead of drop+add.

## 3. Edit the schema
- Modify `apps/backend/prisma/schema.prisma`
- Follow existing naming conventions (camelCase fields, PascalCase models)
- Add `@db.Text` for long strings, `@default(now())` for timestamps

## 4. Create the migration
```bash
cd apps/backend && npx prisma migrate dev --name <descriptive-name>
```
Use kebab-case names that describe the change (e.g. `add-user-bio`, `remove-legacy-token`).

## 5. Regenerate Prisma client
```bash
cd apps/backend && npx prisma generate
```

## 6. Verify tests still pass
```bash
pnpm --filter backend test
```

## 7. Check seed still works (if data was dropped/renamed)
```bash
pnpm --filter backend run prisma:seed
```

## 8. Remind the user
- Migration file is in `apps/backend/prisma/migrations/` — commit it with the schema change
- Production deployment uses `prisma migrate deploy` (already in CI)
- If the migration is destructive, recommend a backup before deploying to production
