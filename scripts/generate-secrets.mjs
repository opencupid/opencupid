#!/usr/bin/env node

// Generates secrets for .env — copy/paste the values you need.
// No dependencies required (uses node:crypto only).
//
// Usage: node scripts/generate-secrets.mjs

import { randomUUID, generateKeyPairSync } from 'node:crypto'

// --- Simple secrets (UUID v4) ---
console.log('# Secrets (paste into .env)\n')
console.log(`JWT_SECRET=${randomUUID()}`)
console.log(`AUTH_IMG_HMAC_SECRET=${randomUUID()}`)
console.log(`ALTCHA_HMAC_KEY=${randomUUID()}`)

// --- VAPID key pair (EC P-256 / prime256v1, URL-safe base64) ---
const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' },
})

// web-push expects the raw 65-byte uncompressed public key and 32-byte private scalar,
// both encoded as URL-safe base64 (no padding).
// SPKI DER = 26-byte header + 65-byte EC point; PKCS8 DER = 36-byte header + 32-byte scalar + …
const vapidPublic = publicKey.subarray(-65).toString('base64url')
const vapidPrivate = privateKey.subarray(36, 36 + 32).toString('base64url')

console.log(`\n# VAPID keys for web push\n`)
console.log(`VAPID_PUBLIC_KEY=${vapidPublic}`)
console.log(`VAPID_PRIVATE_KEY=${vapidPrivate}`)
