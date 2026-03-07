import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const AUTH_REDIRECT_SCRIPT =
  "<script>if(localStorage.getItem('token'))location.replace('/home')</script>"

export function injectAppHtml(template: string, appHtml: string) {
  return template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)
}

export function injectHeadScript(template: string, scriptTag: string) {
  return template.replace('</head>', `  ${scriptTag}\n</head>`)
}

export async function prerenderLanding(frontendRoot: string) {
  const distDir = path.resolve(frontendRoot, 'dist')
  const clientIndexPath = path.resolve(distDir, 'index.html')
  const landingPath = path.resolve(distDir, 'landing.html')
  const ssrEntryPath = path.resolve(frontendRoot, 'dist-ssr', 'entry-landing-ssr.js')

  ;(globalThis as typeof globalThis & { __APP_CONFIG__: { SITE_NAME: string } }).__APP_CONFIG__ = {
    SITE_NAME: 'OpenCupid',
  }
  ;(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '0.0.0'
  globalThis.eval('var __APP_CONFIG__ = globalThis.__APP_CONFIG__')
  globalThis.eval('var __APP_VERSION__ = globalThis.__APP_VERSION__')

  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'

  try {
    const [{ renderLandingPage }, indexHtml] = await Promise.all([
      import(ssrEntryPath),
      readFile(clientIndexPath, 'utf-8'),
    ])

    const renderedLanding = await renderLandingPage()

    const withLandingMarkup = injectAppHtml(indexHtml, renderedLanding)
    const withAuthRedirect = injectHeadScript(withLandingMarkup, AUTH_REDIRECT_SCRIPT)

    await writeFile(landingPath, withAuthRedirect, 'utf-8')
  } finally {
    process.env.NODE_ENV = originalNodeEnv
  }

  console.log(`Pre-rendered landing page written to: ${landingPath}`)
}
