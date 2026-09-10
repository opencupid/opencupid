import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

/**
 * `reconcile_migration_history.sql` rewrites recorded checksums in
 * `_prisma_migrations` for migrations whose SQL was edited after being applied.
 * Prisma checksums a migration as the sha256 of its `migration.sql`, so each
 * hard-coded value here has to equal that file's current hash — if a migration
 * is edited again and the script isn't regenerated, operators run the documented
 * procedure, it reports success, and the next `prisma migrate dev` still demands
 * `migrate reset` ("All data will be lost").
 */

const migrationsDir = path.join(__dirname, '../../../prisma/migrations')
const script = readFileSync(path.join(migrationsDir, 'reconcile_migration_history.sql'), 'utf8')

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** [migrationName, checksum] for every `SET checksum = '…' WHERE migration_name = '…'`. */
function checksumUpdates(): [string, string][] {
  const re = /SET\s+checksum\s*=\s*'([a-f0-9]{64})'\s*WHERE\s+migration_name\s*=\s*'([^']+)'/gi
  return [...script.matchAll(re)].map((m) => [m[2], m[1]])
}

/** Migration names the script deletes rows for. */
function deletedMigrations(): string[] {
  const re = /DELETE\s+FROM\s+"_prisma_migrations"\s*WHERE\s+migration_name\s*=\s*'([^']+)'/gi
  return [...script.matchAll(re)].map((m) => m[1])
}

describe('reconcile_migration_history.sql', () => {
  const updates = checksumUpdates()

  it('rewrites at least one checksum', () => {
    // Guards the parser: an empty list would make the per-entry test vacuous.
    expect(updates.length).toBeGreaterThan(0)
  })

  it.each(updates)('checksum for %s matches that migration.sql on disk', (name, checksum) => {
    const file = path.join(migrationsDir, name, 'migration.sql')
    expect(existsSync(file), `${name}/migration.sql is missing`).toBe(true)
    expect(sha256(readFileSync(file, 'utf8'))).toBe(checksum)
  })

  it.each(deletedMigrations())('%s is deleted from the tree, matching its removed row', (name) => {
    // A row removed from _prisma_migrations while the directory still exists
    // would make Prisma re-apply the migration against a database that has it.
    expect(existsSync(path.join(migrationsDir, name))).toBe(false)
  })
})
