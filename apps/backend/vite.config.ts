
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// Only job: compile EmailTemplate.vue into an SSR-friendly ESM module.
export default defineConfig({
  plugins: [vue()],
  build: {
    ssr: path.resolve(__dirname, 'src/services/email/EmailTemplate.vue'),
    outDir: 'src/services/email',
    emptyOutDir: false,
    rollupOptions: {
      // keep deps external so the output stays small and fast
      external: ['vue', '@vue/server-renderer'],
      output: {
        format: 'esm',
        entryFileNames: 'EmailTemplate.ssr.mjs',
      },
    },
    target: 'node22',
    minify: false,
  },
})
