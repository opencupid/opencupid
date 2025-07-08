// vite-plugin-meta-inject.ts
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

export default function MetaInjectPlugin(mode: string): Plugin {
  const env = loadEnv(mode, '../../', '')

  const metaTags = `
    <meta property="og:title" content="${env.OG_TITLE}" />
    <title>${env.SITE_NAME}</title>
    <meta property="og:description" content="${env.OG_DESCRIPTION}" />
    <meta property="og:image" content="${env.OG_IMAGE}" />
    <meta property="og:url" content="${env.OG_URL}" />
    <meta property="og:type" content="${env.OG_TYPE}" />
  `

  return {
    name: 'html-meta-inject',
    transformIndexHtml(html) {
      return html.replace('<!--meta-head-->', metaTags)
    },
  }
}
