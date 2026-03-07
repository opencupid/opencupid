import { createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import juice from 'juice'
import type { EmailPayload } from './types'
import emailCss from './emailTemplate.css'

export async function renderEmail(component: Component, payload: EmailPayload): Promise<string> {
  const app = createSSRApp(component, payload.templateProps)
  const bodyInner = await renderToString(app)

  const doc = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${payload.subject}</title>
  <style>${emailCss}</style>
</head>
<body style="margin:0;padding:0;">
${bodyInner}
</body>
</html>`
  // Inline CSS for email client compatibility
  return juice(doc, {
    removeStyleTags: true, // remove <style> after inlining
    preserveMediaQueries: true, // keep @media rules if present
    applyStyleTags: true,
    insertPreservedExtraCss: true,
    preserveImportant: true,
  })
}
