// apps/backend/src/plugins/tiles-proxy.ts
import type { FastifyPluginAsync } from 'fastify'

import { fetch } from 'undici'
import { LRUCache } from 'lru-cache'

type CacheEntry = {
  body: Buffer
  contentType: string
  etag?: string
  lastModified?: string
}

const tilesPlugin: FastifyPluginAsync = async (fastify) => {
  const UPSTREAM = process.env.TILE_UPSTREAM ?? 'https://{s}.tile.openstreetmap.org'
  const SUBDOMAINS = (process.env.TILE_SUBDOMAINS ?? 'a,b,c').split(',')
  const UA = process.env.TILE_USER_AGENT ?? 'OpenCupid/tiles-proxy (contact: you@example.com)'
  const REF = process.env.TILE_REFERER ?? 'https://localhost'
  const MAX_AGE = Number(process.env.TILE_MAX_AGE_SECONDS ?? 86400)
  const LRU_SIZE = Number(process.env.TILE_CACHE_ITEMS ?? 500)

    max: LRU_SIZE, // items
    ttl: 0, // no TTL (use upstream caching headers instead)
  })
  // polite: identify ourselves to OSM
  const baseHeaders = {
    'User-Agent': UA,
    'Referer': REF,
  }

  fastify.get<{
    Params: { z: string; x: string; y: string }
  }>('/api/tiles/:z/:x/:y.png', async (req, reply) => {
    const { z, x, y } = req.params

    // simple bounds guard
    const zNum = Number(z)
    const xNum = Number(x)
    const yNum = Number(y)
    if (!Number.isFinite(zNum) || !Number.isFinite(xNum) || !Number.isFinite(yNum) || zNum < 0 || zNum > 19) {
      return reply.code(400).send('bad tile coords')
    }

    const key = `${z}/${x}/${y}.png`
    const cached = cache.get(key)

    // Pick subdomain deterministically to spread load
    const sd = SUBDOMAINS[(xNum + yNum) % SUBDOMAINS.length]
    const upstreamUrl = `${UPSTREAM.replace('{s}', sd)}/${key}`

    // Prepare conditional headers if we have metadata
    const condHeaders: Record<string, string> = { ...baseHeaders }
    if (cached?.etag) condHeaders['If-None-Match'] = cached.etag
    if (cached?.lastModified) condHeaders['If-Modified-Since'] = cached.lastModified

    // Fetch from upstream
    const res = await fetch(upstreamUrl, { headers: condHeaders })

    // 304 → serve from browser cache (just pass through)
    if (res.status === 304 && cached) {
      reply
        .code(304)
        .header('Cache-Control', `public, max-age=${MAX_AGE}`)
        .header('Access-Control-Allow-Origin', '*') // images-safe
        .header('ETag', cached.etag ?? '')
        .header('Last-Modified', cached.lastModified ?? '')
      return reply.send()
    }

    if (!res.ok) {
      // fall back to cached if upstream fails
      if (cached) {
        reply
          .code(200)
          .header('Content-Type', cached.contentType)
          .header('Cache-Control', `public, max-age=${MAX_AGE}`)
          .header('Access-Control-Allow-Origin', '*')
        return reply.send(cached.body)
      }
      return reply.code(res.status).send(`upstream ${res.status}`)
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') ?? 'image/png'
    const etag = res.headers.get('etag') ?? undefined
    const lastMod = res.headers.get('last-modified') ?? undefined

    cache.set(key, { body: buf, contentType: ct, etag, lastModified: lastMod })

    reply
      .code(200)
      .header('Content-Type', ct)
      .header('Cache-Control', `public, max-age=${MAX_AGE}`)
      .header('Access-Control-Allow-Origin', '*')
    if (etag !== undefined) {
      reply.header('ETag', etag)
    }
    if (lastMod !== undefined) {
      reply.header('Last-Modified', lastMod)
    }

    return reply.send(buf)
  })
}

export default tilesPlugin
