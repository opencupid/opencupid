import { readFileSync, writeFileSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')
const distSsrDir = resolve(__dirname, '../dist-ssr')

const { render } = (await import(resolve(distSsrDir, 'ssr-entry.js'))) as {
  render: () => Promise<string>
}

const renderedHtml = await render()

const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8')

const authRedirectScript = `<script>if(localStorage.getItem('token'))location.replace('/home')</script>`

const landing = template
  .replace('</head>', `  ${authRedirectScript}\n  </head>`)
  .replace(/(<div\s[^>]*id="app"[^>]*>)<\/div>/s, `$1${renderedHtml}</div>`)

writeFileSync(resolve(distDir, 'landing.html'), landing)
rmSync(distSsrDir, { recursive: true, force: true })
console.log('[prerender] dist/landing.html written')
