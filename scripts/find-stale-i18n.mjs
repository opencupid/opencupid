#!/usr/bin/env node
// One-shot: find i18n keys present in locale files but unreferenced in source code.
// Handles t('key'), $t('key'), t("key"), $t("key"), and static-prefixed template literals.
// Allowlisted dynamic prefixes are treated as fully referenced.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const APPLY = process.argv.includes('--apply')

const ROOTS = [
  'apps/frontend/src',
  'apps/admin/src',
  'apps/backend/src',
  'packages/shared',
]
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'dist', '.turbo', 'i18n', 'coverage'])
const LOCALES = ['packages/shared/i18n/en.json', 'packages/shared/i18n/hu.json']
const EXTS = new Set(['.ts', '.vue', '.js', '.mjs', '.tsx'])

// Prefixes we know are filled in dynamically by code; keep all keys under them.
const DYNAMIC_PREFIXES = [
  'gender',
  'gender_preferences',
  'relationship',
  'haskids',
  'haskids_label',
  'haskids_preference',
  'pronouns',
  'profiles.forms.edit_titles',
  'posts.types',
  'emails',
]

// Captures: t('foo.bar'), $t("foo.bar"), t(`foo.bar`)  (static keys only)
// Loose start \b excludes set(/text(/format( etc. by requiring quote/backtick right after (
const KEY_PATTERN = /(?<![A-Za-z0-9_$])\$?t\(\s*(['"`])([\w][\w.]*)\1/g

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const e of entries) {
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(e)) continue
      walk(p, out)
    } else if (EXTS.has(extname(e))) {
      out.push(p)
    }
  }
  return out
}

const referenced = new Set()
const sourceFiles = ROOTS.flatMap(r => walk(r))
for (const f of sourceFiles) {
  const src = readFileSync(f, 'utf8')
  let m
  KEY_PATTERN.lastIndex = 0
  while ((m = KEY_PATTERN.exec(src))) referenced.add(m[2])
}

// Gather all leaf key paths from each locale file
function leaves(obj, prefix = '', acc = []) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) leaves(v, path, acc)
    else acc.push(path)
  }
  return acc
}

function isReferenced(path) {
  if (referenced.has(path)) return true
  for (const pref of DYNAMIC_PREFIXES) {
    if (path === pref || path.startsWith(pref + '.')) return true
  }
  return false
}

function deletePath(obj, parts) {
  const [head, ...rest] = parts
  if (!(head in obj)) return
  if (rest.length === 0) { delete obj[head]; return }
  deletePath(obj[head], rest)
  if (obj[head] && typeof obj[head] === 'object' && !Array.isArray(obj[head]) && Object.keys(obj[head]).length === 0) {
    delete obj[head]
  }
}

const report = {}
for (const lf of LOCALES) {
  const json = JSON.parse(readFileSync(lf, 'utf8'))
  const all = leaves(json)
  const stale = all.filter(p => !isReferenced(p)).sort()
  report[lf] = { total: all.length, stale }

  if (APPLY && stale.length) {
    for (const path of stale) deletePath(json, path.split('.'))
    writeFileSync(lf, JSON.stringify(json, null, 2) + '\n')
  }
}

// Output
console.log(`scanned ${sourceFiles.length} source files`)
console.log(`found ${referenced.size} statically-referenced i18n keys`)
console.log(`dynamic prefixes (kept): ${DYNAMIC_PREFIXES.join(', ')}`)
console.log()
for (const [lf, r] of Object.entries(report)) {
  console.log(`=== ${lf}: ${r.total} keys total, ${r.stale.length} stale${APPLY ? ' (deleted)' : ''} ===`)
  if (!APPLY) for (const k of r.stale) console.log(`  ${k}`)
  console.log()
}
if (APPLY) console.log('Wrote cleaned locale files. Re-run without --apply to verify (should report 0 stale).')
