import fp from 'fastify-plugin'
import fs from 'fs'
import path from 'path'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { appConfig } from '@/lib/appconfig'

export default fp(async fastify => {
  const distIndex = path.resolve(process.cwd(), 'apps/frontend/dist/index.html')
  const devIndex = path.resolve(process.cwd(), 'apps/frontend/index.html')
  const indexPath = fs.existsSync(distIndex) ? distIndex : devIndex
  const template = fs.readFileSync(indexPath, 'utf8')

  fastify.get('/', async (_req, reply) => {
    const metaApp = createSSRApp({
      render() {
        return [
          h('meta', { property: 'og:title', content: appConfig.OG_TITLE }),
          h('meta', { property: 'og:description', content: appConfig.OG_DESCRIPTION }),
          h('meta', { property: 'og:image', content: appConfig.OG_IMAGE }),
          h('meta', { property: 'og:url', content: appConfig.OG_URL }),
          h('meta', { property: 'og:type', content: appConfig.OG_TYPE }),
        ]
      },
    })

    const meta = await renderToString(metaApp)
    const html = template.replace('<!--og-meta-->', meta)
    reply.type('text/html').send(html)
  })
})
