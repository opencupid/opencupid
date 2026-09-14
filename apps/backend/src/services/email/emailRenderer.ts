import { createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import juice from 'juice'
import type { EmailPayload, EmailTemplateProps } from './types'
import emailCss from './emailTemplate.css'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

/**
 * Escape text interpolated into the document shell. The component tree is
 * escaped by Vue; this covers the head, which is assembled as a string.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c])
}

export async function renderEmail(component: Component, payload: EmailPayload): Promise<string> {
  const app = createSSRApp(component, payload.templateProps)
  const bodyInner = await renderToString(app)

  const doc = `<!doctype html>
<html lang="${escapeHtml(payload.language)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(payload.subject)}</title>
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

/**
 * Plain-text alternative, rendered from the same props as the HTML part.
 *
 * Without this nodemailer emits a bare text/html message and the relay
 * synthesizes a text part by stripping our markup — which repeats the CTA
 * URL once per occurrence in the HTML (button, then fallback hint). Here the
 * URL appears exactly once, and `fallbackHint` is dropped: "if the button
 * doesn't work" describes nothing in a plain-text body.
 */
export function renderEmailText(props: EmailTemplateProps): string {
  const blocks = [
    props.siteName,
    props.contentBody,
    `${props.callToActionLabel}: ${props.callToActionUrl}`,
    props.footer,
    props.unsubscribeUrl ? `${props.unsubscribeLabel}: ${props.unsubscribeUrl}` : undefined,
  ]
  return blocks.filter((block): block is string => Boolean(block?.trim())).join('\n\n') + '\n'
}
