import path from 'node:path'
import type { PluginOption } from 'vite'
import { defineConfig, mergeConfig } from 'vite'
import baseConfig from './vite.config'
import { prerenderLanding } from './scripts/prerender-landing'

function prerenderLandingPlugin(frontendRoot: string): PluginOption {
  return {
    name: 'prerender-landing-page',
    apply: 'build',
    closeBundle: async () => {
      await prerenderLanding(frontendRoot)
    },
  }
}

export default defineConfig((env) => {
  const frontendRoot = path.resolve(__dirname)

  const resolvedBase = typeof baseConfig === 'function' ? baseConfig(env) : baseConfig

  return mergeConfig(resolvedBase, {
    plugins: [prerenderLandingPlugin(frontendRoot)],
  })
})
