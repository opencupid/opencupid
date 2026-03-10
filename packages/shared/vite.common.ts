import path from 'path'
import os from 'os'
import { loadEnv, type Plugin } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import DevInspector from '@mcpc-tech/unplugin-dev-inspector-mcp'
import type { DevInspectorOptions } from '@mcpc-tech/unplugin-dev-inspector-mcp'
import { getPackageVersion } from './version'
import { findUpSync } from './findUp'
import { appConfigSchema } from './zod/config/appConfig.schema'

export const hostname = os.hostname()
export const mdnsName = hostname + '.local'

export const devCertPlugin = () =>
  mkcert({
    hosts: ['localhost', '127.0.0.1', hostname, mdnsName],
    savePath: path.join(__dirname, '../../certs'),
    keyFileName: hostname + '-key.pem',
    certFileName: hostname + '-cert.pem',
    autoUpgrade: false,
  })

export const server = (mode: string, env: Record<string, string | undefined>, appDir: string) => {
  if (mode !== 'development') return {}

  const backendPort = env.BACKEND_PORT ?? '3000'

  return {
    server: {
      host: true,
      allowedHosts: ['localhost', '127.0.0.1', hostname, mdnsName],
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
          headers: { 'X-Admin-Authenticated': 'true' },
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any, req: any) => {
              const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
              if (clientIp) {
                proxyReq.setHeader('X-Forwarded-For', clientIp)
              }
            })
          },
        },
        '/ws': {
          target: `ws://localhost:${backendPort}`,
          rewriteWsOrigin: true,
          ws: true,
          secure: false,
        },
      },
      fs: {
        allow: [
          appDir,
          path.resolve(appDir, '../../packages/shared'),
          path.resolve(appDir, '../../node_modules'),
        ],
      },
    },
  }
}

export const loadProjectEnv = (mode: string) => {
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')

  if (!envFile) {
    return {
      ...process.env,
    }
  }

  const envDir = path.dirname(envFile)

  return {
    ...process.env,
    ...loadEnv(mode, envDir, ''),
  }
}

export const define = (appDir: string) => {
  const appVersion = getPackageVersion(path.join(appDir, 'package.json'))

  return {
    envDir: '../../',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
  }
}

export const devInspectorPlugin = (
  mode: string,
  appDir: string,
  options: Omit<DevInspectorOptions, 'enabled'> = {}
) => {
  if (mode !== 'development') return []

  // Use customEditors for claude-code so .mcp.json lands in the monorepo root
  // (the built-in "claude-code" editor writes relative to the Vite app dir)
  const monorepoRoot = path.resolve(appDir, '../..')

  const plugin = DevInspector.vite({
    enabled: true,
    disableChrome: false,
    showInspectorBar: true,
    updateConfigServerName: 'oc-inspector',
    updateConfig: ['vscode'],
    customEditors: [
      {
        id: 'claude-code',
        name: 'Claude Code',
        configPath: monorepoRoot,
        configFileName: '.mcp.json',
        configFormat: 'mcpServers',
      },
    ],
    visibleAgents: ['Claude Code'],
    defaultAgent: 'Claude Code',
    agents: [
      {
        name: 'Claude Code',
        command: 'claude-agent-acp',
        args: [],
        env: [],
        npmPackage: '@zed-industries/claude-agent-acp',
      },
    ],
    ...options,
  })

  return [plugin].flat()
}

export const commonResolveAliases = (appDir: string) => ({
  '@': path.resolve(appDir, './src'),
  '@zod': path.resolve(appDir, '../../packages/shared/zod'),
})

export const runtimeConfigPlugin = (mode: string): Plugin => {
  const env = mode === 'development' ? loadProjectEnv(mode) : process.env

  const schemaKeys = Object.keys(appConfigSchema.shape)
  const envSubset = Object.fromEntries(
    schemaKeys.map((k) => [k, env[k]]).filter(([, v]) => v !== undefined)
  )
  const parseResult = appConfigSchema.safeParse(envSubset)

  if (!parseResult.success) {
    const formatted = parseResult.error.format()
    throw new Error(
      `Invalid __APP_CONFIG__: check your .env file.\n${JSON.stringify(formatted, null, 2)}`
    )
  }

  const configJs = `window.__APP_CONFIG__ = ${JSON.stringify(parseResult.data)};
`

  return {
    name: 'runtime-config',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/config.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(configJs)
          return
        }
        next()
      })
    },
  }
}
