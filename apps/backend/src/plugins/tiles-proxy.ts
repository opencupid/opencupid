// apps/backend/src/plugins/tiles-proxy.ts
import type { FastifyPluginAsync } from 'fastify'

import ratelimit from '@fastify/rate-limit'
import { fetch } from 'undici'
import { LRUCache } from 'lru-cache'

type CacheEntry = {
  body: Buffer
  contentType: string
  etag?: string
  lastModified?: string
}

const tilesPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(ratelimit, {
    global: false,
  })

  const UPSTREAM = process.env.TILE_UPSTREAM ?? 'https://{s}.tile.openstreetmap.org'
  const SUBDOMAINS = (process.env.TILE_SUBDOMAINS ?? 'a,b,c').split(',')
  const UA = process.env.TILE_USER_AGENT ?? 'OpenCupid/tiles-proxy (contact: you@example.com)'
  const REF = process.env.TILE_REFERER ?? 'https://localhost'
  const MAX_AGE = Number(process.env.TILE_MAX_AGE_SECONDS ?? 86400)
  const LRU_SIZE = Number(process.env.TILE_CACHE_ITEMS ?? 500)
  const TILE_TIMEOUT = Number(process.env.TILE_TIMEOUT_MS ?? 15000)
  const TILE_RETRIES = Number(process.env.TILE_RETRIES ?? 2)

  const cache = new LRUCache<string, CacheEntry>({
    max: Number(LRU_SIZE), // items
    ttl: 0, // no TTL (use upstream caching headers instead)
  })
  // polite: identify ourselves to OSM
  const baseHeaders = {
    'User-Agent': UA,
    Referer: REF,
  }

  // Retry function for failed requests
  async function fetchWithRetry(
    url: string,
    options: any,
    retries: number
  ): Promise<globalThis.Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TILE_TIMEOUT)

        const response = (await fetch(url, {
          ...options,
          signal: controller.signal,
        })) as unknown as globalThis.Response

        clearTimeout(timeoutId)

        if (response.ok || response.status === 304) {
          return response
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response
        }

        // For server errors (5xx) or network errors, retry if attempts remain
        if (attempt < retries) {
          fastify.log.warn(
            `Tile fetch attempt ${attempt + 1} failed with status ${response.status}, retrying...`
          )
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000)) // exponential backoff
          continue
        }

        return response
      } catch (error: any) {
        if (
          attempt < retries &&
          (error.code === 'ABORT_ERR' ||
            error.name === 'AbortError' ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.message === 'fetch failed')
        ) {
          fastify.log.warn(
            `Tile fetch attempt ${attempt + 1} failed with error ${error.message}, retrying...`
          )
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000)) // exponential backoff
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  }

  fastify.get<{
    Params: { z: string; x: string; y: string }
  }>(
    '/api/tiles/:z/:x/:y.png',
    {
      config: {
        rateLimit: {
          max: 100,
          timeWindow: '1 second',
        },
      },
    },
    async (req, reply) => {
      const { z, x, y } = req.params

      // simple bounds guard
      const zNum = Number(z)
      const xNum = Number(x)
      const yNum = Number(y)
      if (
        !Number.isFinite(zNum) ||
        !Number.isFinite(xNum) ||
        !Number.isFinite(yNum) ||
        zNum < 0 ||
        zNum > 19
      ) {
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

      // Fetch from upstream with retry logic
      try {
        const res = await fetchWithRetry(upstreamUrl, { headers: condHeaders }, TILE_RETRIES)

        // 304 → serve from browser cache (just pass through)
        if (res.status === 304 && cached) {
          reply
            .code(304)
            .header('Cache-Control', `public, max-age=${MAX_AGE}`)
            .header('Access-Control-Allow-Origin', '*') // images-safe

          if (cached.etag !== undefined) {
            reply.header('ETag', cached.etag)
          }
          if (cached.lastModified !== undefined) {
            reply.header('Last-Modified', cached.lastModified)
          }
          return reply.send()
        }

        if (!res.ok) {
          // fall back to cached if upstream fails
          if (cached) {
            fastify.log.warn(`Upstream failed with ${res.status}, serving from cache`)
            reply
              .code(200)
              .header('Content-Type', cached.contentType)
              .header('Cache-Control', `public, max-age=${MAX_AGE}`)
              .header('Access-Control-Allow-Origin', '*')
            return reply.send(cached.body)
          }
          fastify.log.error(`Upstream failed with ${res.status} and no cache available`)
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
      } catch (error: any) {
        fastify.log.error(`Tile request failed: ${error.message}`)

        // Try to serve from cache if available
        if (cached) {
          fastify.log.warn('Serving stale tile from cache due to upstream error')
          reply
            .code(200)
            .header('Content-Type', cached.contentType)
            .header('Cache-Control', `public, max-age=${MAX_AGE}`)
            .header('Access-Control-Allow-Origin', '*')
          return reply.send(cached.body)
        }

        // No cache available, return error
        return reply.code(502).send('tile unavailable')
      }
    }
  )
}

export default tilesPlugin
