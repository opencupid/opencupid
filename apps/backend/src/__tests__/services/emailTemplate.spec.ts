import { describe, it, expect } from 'vitest'
import { renderEmail } from '../../services/email/emailRenderer'
import EmailTemplate from '../../services/email/EmailTemplate.ssr.mjs'
import type { EmailPayload } from '../../services/email/types'
import { brandStub } from '../../test-utils/brand'

const payload = (contentBody: string): EmailPayload => ({
  to: 'alice@example.com',
  subject: 'You have a new message',
  language: 'hu',
  brand: brandStub,
  templateProps: {
    siteName: 'TestSite',
    publicName: 'Alice',
    contentBody,
    callToActionLabel: 'Read message',
    callToActionUrl: 'https://example.com/inbox',
    fallbackHint: 'If the button does not work, copy and paste the URL.',
  },
})

describe('EmailTemplate', () => {
  // contentBody carries user-authored text (new_message interpolates {sender}
  // and {message}). i18next-icu formats without escaping, so the template is
  // the only thing standing between a user and arbitrary markup in mail signed
  // by our domain. No locale string contains HTML, so nothing needs raw output.
  it('escapes markup in contentBody instead of rendering it', async () => {
    const html = await renderEmail(
      EmailTemplate,
      payload('Hi <a href="https://phish.example">click</a> <script>alert(1)</script>')
    )
    expect(html).not.toContain('<a href="https://phish.example"')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;a href=&quot;https://phish.example&quot;&gt;')
  })

  it('renders plain contentBody text unchanged', async () => {
    const html = await renderEmail(EmailTemplate, payload('Someone smiled at you.'))
    expect(html).toContain('Someone smiled at you.')
  })

  it('renders the CTA and its URL', async () => {
    const html = await renderEmail(EmailTemplate, payload('Hello'))
    expect(html).toContain('https://example.com/inbox')
    expect(html).toContain('Read message')
  })
})
