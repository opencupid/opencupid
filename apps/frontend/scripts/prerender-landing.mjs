import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(frontendRoot, 'dist')
const clientIndexPath = path.resolve(distDir, 'index.html')
const landingPath = path.resolve(distDir, 'landing.html')
const ssrEntryPath = path.resolve(frontendRoot, 'dist-ssr', 'entry-landing-ssr.js')

const AUTH_REDIRECT_SCRIPT =
  "<script>if(localStorage.getItem('token'))location.replace('/home')</script>"

function injectAppHtml(template, appHtml) {
  return template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)
}

function injectHeadScript(template, scriptTag) {
  return template.replace('</head>', `  ${scriptTag}\n</head>`)
}

async function run() {
  globalThis.__APP_CONFIG__ = {
    SITE_NAME: 'OpenCupid',
  }
  globalThis.__APP_VERSION__ = '0.0.0'
  globalThis.eval('var __APP_CONFIG__ = globalThis.__APP_CONFIG__')
  globalThis.eval('var __APP_VERSION__ = globalThis.__APP_VERSION__')

  const [{ renderLandingPage }, indexHtml] = await Promise.all([
    import(ssrEntryPath),
    readFile(clientIndexPath, 'utf-8'),
  ])

  const renderedLanding = await renderLandingPage()

  const withLandingMarkup = injectAppHtml(indexHtml, renderedLanding)
  const withAuthRedirect = injectHeadScript(withLandingMarkup, AUTH_REDIRECT_SCRIPT)

  await writeFile(landingPath, withAuthRedirect, 'utf-8')

  console.log(`Pre-rendered landing page written to: ${landingPath}`)
}

run().catch((error) => {
  console.error('Failed to pre-render landing page.', error)
  process.exitCode = 1
})

export { injectAppHtml, injectHeadScript }
