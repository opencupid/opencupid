// @vitest-environment node
import { createServer as createHttpServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import { server } from '../../../../packages/shared/vite.common'

describe('dev server /api proxy', () => {
  let backend: Server
  let vite: ViteDevServer
  let viteOrigin: string
  let received: IncomingHttpHeaders | undefined

  beforeAll(async () => {
    backend = createHttpServer((req, res) => {
      received = req.headers
      res.end('ok')
    })
    await new Promise<void>((resolve) => backend.listen(0, '127.0.0.1', resolve))
    const backendPort = String((backend.address() as AddressInfo).port)

    const { server: serverConfig } = server('development', { BACKEND_PORT: backendPort }, __dirname)
    vite = await createServer({
      configFile: false,
      logLevel: 'silent',
      server: { ...serverConfig, host: '127.0.0.1', hmr: false, ws: false },
    })
    await vite.listen()
    viteOrigin = `http://127.0.0.1:${(vite.httpServer!.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await vite?.close()
    await new Promise((resolve) => backend?.close(resolve))
  })

  // The backend picks the brand from the request host (brandForHost), so the
  // proxy must forward the host the browser used, not rewrite it to its target.
  it('forwards the browser host to the backend', async () => {
    const res = await fetch(`${viteOrigin}/api/auth/me`)
    expect(res.status).toBe(200)
    expect(received?.host).toBe(new URL(viteOrigin).host)
  })
})
