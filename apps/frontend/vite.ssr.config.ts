import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import { define, loadProjectEnv, buildAppConfig, sharedPlugins, sharedResolve } from './vite.common'

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadProjectEnv(mode)
  return {
    ...define(mode),
    define: {
      __APP_CONFIG__: JSON.stringify(buildAppConfig(env)),
    },
    build: {
      ssr: 'src/ssr-entry.ts',
      outDir: 'dist-ssr',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
    ssr: {
      noExternal: true,
    },
    plugins: sharedPlugins(__dirname),
    resolve: sharedResolve(__dirname),
  }
})
