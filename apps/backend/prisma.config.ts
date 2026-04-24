import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed/tags.js',
  },
})
