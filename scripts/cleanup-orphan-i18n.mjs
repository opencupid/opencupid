#!/usr/bin/env node
// Throw-away script: find i18n keys referenced in the codebase via t()/$t()
// and remove keys from packages/shared/i18n/{en,hu}.json that are no longer used.
//
// Usage:
//   node scripts/cleanup-orphan-i18n.mjs           # dry run, lists orphans
//   node scripts/cleanup-orphan-i18n.mjs --write   # delete orphan keys

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')

const SOURCE_DIRS = [
  'apps/frontend/src',
  'apps/admin/src',
  'apps/backend/src',
  'packages/shared',
]

const EXTENSIONS = new Set(['.vue', '.ts', '.tsx', '.js', '.mjs', '.cjs'])

const I18N_FILES = [
  'packages/shared/i18n/en.json',
  'packages/shared/i18n/hu.json',
]

// Prefixes coming from template literals where the prefix is a variable
// (e.g. useEnumOptions: t(`${prefix}.${value}`)). Keep any key under these.
const VARIABLE_PREFIX_ALLOWLIST = [
  'gender',
  'gender_preferences',
  'relationship',
  'haskids',
  'haskids_label',
  'haskids_preference',
  'pronouns',
]

const STATIC_RE = /(?<![a-zA-Z0-9_$])\$?t\(\s*(['"])([a-zA-Z0-9_.\-]+)\1/g
const DYNAMIC_RE = /(?<![a-zA-Z0-9_$])\$?t\(\s*`([^`$]*)\$\{/g

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.turbo') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, files)
    else if (EXTENSIONS.has(path.extname(ent.name))) files.push(full)
  }
  return files
}

const staticKeys = new Set()
const dynamicPrefixes = new Set(VARIABLE_PREFIX_ALLOWLIST)

let fileCount = 0
for (const rel of SOURCE_DIRS) {
  const base = path.join(ROOT, rel)
  if (!fs.existsSync(base)) continue
  for (const file of walk(base)) {
    fileCount++
    const txt = fs.readFileSync(file, 'utf8')
    for (const m of txt.matchAll(STATIC_RE)) staticKeys.add(m[2])
    for (const m of txt.matchAll(DYNAMIC_RE)) {
      const prefix = m[1].replace(/\.$/, '')
      if (prefix) dynamicPrefixes.add(prefix)
    }
  }
}

function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out.push(key)
  }
}

function isReferenced(key) {
  if (staticKeys.has(key)) return true
  for (const p of dynamicPrefixes) {
    if (key === p || key.startsWith(p + '.')) return true
  }
  return false
}

function prune(obj, prefix) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = prune(v, key)
      if (Object.keys(inner).length > 0) out[k] = inner
    } else if (isReferenced(key)) {
      out[k] = v
    }
  }
  return out
}

console.log(`Scanned ${fileCount} source files`)
console.log(`Found ${staticKeys.size} static t() keys`)
console.log(`Dynamic prefixes: ${[...dynamicPrefixes].sort().join(', ')}\n`)

for (const rel of I18N_FILES) {
  const file = path.join(ROOT, rel)
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  const before = []
  flatten(json, '', before)
  const pruned = prune(json, '')
  const after = []
  flatten(pruned, '', after)
  const afterSet = new Set(after)
  const removed = before.filter((k) => !afterSet.has(k))
  console.log(`${rel}: ${before.length} → ${after.length} keys (${removed.length} orphans)`)
  for (const k of removed) console.log(`  - ${k}`)
  if (WRITE) {
    fs.writeFileSync(file, JSON.stringify(pruned, null, 2) + '\n', 'utf8')
    console.log(`  ✎ wrote ${rel}`)
  }
  console.log()
}

if (!WRITE) console.log('Dry run — pass --write to apply.')
