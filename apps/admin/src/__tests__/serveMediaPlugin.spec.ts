// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type RequestListener, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import { serveMediaPlugin } from '../../../../packages/shared/vite.common'

describe('serveMediaPlugin', () => {
  let dir: string
  let http: Server
  let origin: string
  const use = vi.fn()

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'media-'))
    mkdirSync(join(dir, 'images'))
    writeFileSync(join(dir, 'images', 'a-thumb.webp'), 'image-bytes')

    const plugin = serveMediaPlugin({ MEDIA_URL_BASE: '/user-content', MEDIA_UPLOAD_DIR: dir }, '/')
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer({ middlewares: { use } } as unknown as ViteDevServer)

    // Mirrors how connect mounts the handler: the base is stripped from req.url.
    const handler = use.mock.calls[0]![1] as (
      ...args: [...Parameters<RequestListener>, () => void]
    ) => void
    http = createServer((req, res) => {
      req.url = req.url!.replace('/user-content', '')
      handler(req, res, () => res.writeHead(404).end())
    })
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    origin = `http://127.0.0.1:${(http.address() as AddressInfo).port}`
  })

  afterAll(() => {
    http.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('mounts on MEDIA_URL_BASE', () => {
    expect(use.mock.calls[0]![0]).toBe('/user-content')
  })

  it('serves files from MEDIA_UPLOAD_DIR as images', async () => {
    const res = await fetch(`${origin}/user-content/images/a-thumb.webp`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/webp')
    expect(await res.text()).toBe('image-bytes')
  })

  it('passes through when the file does not exist', async () => {
    const res = await fetch(`${origin}/user-content/images/missing.webp`)
    expect(res.status).toBe(404)
  })
})
