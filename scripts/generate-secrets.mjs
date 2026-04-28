#!/usr/bin/env node

// Generates secrets for .env — copy/paste the values you need.
// No dependencies required (uses node:crypto only).
//
// Usage: node scripts/generate-secrets.mjs

import { randomUUID, generateKeyPairSync } from 'node:crypto'

// --- Simple secrets (UUID v4) ---
console.log('# Secrets (paste into .env)\n')
console.log(`JWT_SECRET=${randomUUID()}`)
console.log(`UNSUBSCRIBE_SECRET=${randomUUID()}`)
console.log(`AUTH_IMG_HMAC_SECRET=${randomUUID()}`)
console.log(`ALTCHA_HMAC_KEY=${randomUUID()}`)

// --- VAPID key pair (EC P-256 / prime256v1, URL-safe base64) ---
const { publicKey: publicJwk, privateKey: privateJwk } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { format: 'jwk' },
  privateKeyEncoding: { format: 'jwk' },
})

// web-push expects the raw 65-byte uncompressed public key (0x04 || x || y)
// and the 32-byte private scalar (d), both encoded as URL-safe base64 (no padding).
const xBuf = Buffer.from(publicJwk.x, 'base64url')
const yBuf = Buffer.from(publicJwk.y, 'base64url')
const uncompressedPoint = Buffer.concat([Buffer.from([0x04]), xBuf, yBuf])
const vapidPublic = uncompressedPoint.toString('base64url')
const vapidPrivate = Buffer.from(privateJwk.d, 'base64url').toString('base64url')

console.log(`\n# VAPID keys for web push\n`)
console.log(`VAPID_PUBLIC_KEY=${vapidPublic}`)
console.log(`VAPID_PRIVATE_KEY=${vapidPrivate}`)
