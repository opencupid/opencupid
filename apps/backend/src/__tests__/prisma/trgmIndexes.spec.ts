import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'

/**
 * The pg_trgm GIN indexes backing `/search` are created by SQL migrations but
 * must ALSO be declared in `schema.prisma`. Prisma diffs the datamodel against
 * the database, so an index that exists only in SQL reads as drift and every
 * `prisma migrate dev` emits a `DROP INDEX` for it — silently degrading
 * SearchService's `similarity()` ranking to sequential scans the first time
 * someone commits a generated migration without stripping those lines.
 *
 * The index NAME is the join between the two artifacts: the migration created
 * it under a specific name, so the declaration has to `map:` to that same name
 * or Prisma proposes a drop-and-recreate instead of recognising it.
 */

const prismaDir = path.join(__dirname, '../../../prisma')
const schema = readFileSync(path.join(prismaDir, 'schema.prisma'), 'utf8')

/** Every index name created with `USING GIN (... gin_trgm_ops)` in the migrations. */
function trgmIndexNamesInMigrations(): string[] {
  const migrationsDir = path.join(prismaDir, 'migrations')
  const names: string[] = []

  for (const entry of readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const sql = readFileSync(path.join(migrationsDir, entry.name, 'migration.sql'), 'utf8')
    const re = /CREATE\s+INDEX\s+"([^"]+)"\s+ON\s+"[^"]+"\s+USING\s+GIN\s*\([^)]*gin_trgm_ops/gi
    for (const match of sql.matchAll(re)) names.push(match[1])
  }

  return names
}

describe('pg_trgm GIN indexes', () => {
  const migrationIndexNames = trgmIndexNamesInMigrations()

  it('finds the trigram indexes in the migration history', () => {
    // Guards the parser itself: a silently-empty list would make the drift
    // assertion below vacuously pass.
    expect(migrationIndexNames).toEqual(
      expect.arrayContaining([
        'LocalizedProfileField_value_trgm_idx',
        'UserContent_content_trgm_idx',
      ])
    )
  })

  it.each(migrationIndexNames)('declares %s in schema.prisma so Prisma sees no drift', (name) => {
    const declaration = new RegExp(
      `@@index\\(\\[[^\\]]*gin_trgm_ops[^\\]]*\\][^)]*map:\\s*"${name}"[^)]*type:\\s*Gin`
    )
    expect(schema).toMatch(declaration)
  })

  it('declares the indexed columns SearchService actually ranks on', () => {
    expect(schema).toMatch(/@@index\(\[value\(ops: raw\("gin_trgm_ops"\)\)\]/)
    expect(schema).toMatch(/@@index\(\[content\(ops: raw\("gin_trgm_ops"\)\)\]/)
  })
})
