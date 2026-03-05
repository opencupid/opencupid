
/* TODO FIXME
Cannot find module '@vitejs/plugin-vue' or its corresponding type declarations.
  There are types at '/home/user/opencupid/apps/backend/node_modules/@vitejs/plugin-vue/dist/index.d.mts', but this result could not be resolved under your current 'moduleResolution' setting. Consider updating to 'node16', 'nodenext', or 'bundler'.
  */
import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue'
import path from "node:path"

// Only job: compile EmailTemplate.vue into an SSR-friendly ESM module.
export default defineConfig({
  plugins: [vue()],
  build: {
    ssr: path.resolve(__dirname, "src/services/email/EmailTemplate.vue"),
    outDir: "dist-ssr",
    emptyOutDir: true,
    rollupOptions: {
      // keep deps external so the output stays small and fast
      external: ["vue", "@vue/server-renderer"],
      output: {
        format: "esm",
        entryFileNames: "EmailTemplate.ssr.mjs",
      },
    },
    target: "node22",
    minify: false,
  },
});
