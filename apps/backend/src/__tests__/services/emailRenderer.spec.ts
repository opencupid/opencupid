import { describe, it, expect, vi, beforeEach } from 'vitest'
import { h } from 'vue'
import type { Component } from 'vue'
import type { EmailTemplateProps } from '../../services/email/types'

// Mock the CSS import so the test environment has known CSS to inline
vi.mock('../../services/email/emailTemplate.css', () => ({
  default: `
    .outer { width: 100%; background-color: #f8f5f0; }
    .title { font-size: 24px; color: #3e3f3a; }
    .ctaButton { display: inline-block; background-color: rgb(147, 197, 75); color: #ffffff; }
    @media only screen and (max-width: 600px) { .outer { padding: 8px; } }
  `,
}))

const defaultProps: EmailTemplateProps = {
  siteName: 'TestSite',
  publicName: 'Alice',
  contentBody: '<p>Welcome to the platform!</p>',
  callToActionLabel: 'Get Started',
  callToActionUrl: 'https://example.com/start',
  footer: 'You received this because you signed up.',
}

// A minimal component using a render function (no template compiler required)
const SimpleComponent: Component = {
  props: Object.keys(defaultProps),
  render() {
    return h('div', { class: 'outer' }, [
      h('span', { class: 'title' }, this.publicName),
      h('a', { href: this.callToActionUrl, class: 'ctaButton' }, this.callToActionLabel),
    ])
  },
}

describe('renderEmail', () => {
  let renderEmail: (component: Component, props: EmailTemplateProps) => Promise<string>

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../../services/email/emailRenderer')
    renderEmail = mod.renderEmail
  })

  it('returns a string', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    expect(typeof result).toBe('string')
  })

  it('returns well-formed HTML with doctype, html, head, and body tags', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    expect(result).toMatch(/<!doctype html>/i)
    expect(result).toMatch(/<html[\s>]/i)
    expect(result).toMatch(/<head[\s>]/i)
    expect(result).toMatch(/<body[\s>]/i)
    expect(result).toMatch(/<\/body>/i)
    expect(result).toMatch(/<\/html>/i)
  })

  it('includes a meta charset tag in the head', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    expect(result).toContain('charset="utf-8"')
  })

  it('includes a viewport meta tag in the head', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    expect(result).toContain('name="viewport"')
  })

  it('renders the component output inside the body', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    // The component renders publicName inside a span
    expect(result).toContain(defaultProps.publicName)
    // And the CTA href
    expect(result).toContain(defaultProps.callToActionUrl)
  })

  it('inlines CSS styles from class-based rules into style attributes', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    // The .outer class has `width: 100%` in the mocked CSS
    // juice should inline it as a style attribute on the element with class="outer"
    expect(result).toMatch(/style="[^"]*width:\s*100%[^"]*"/)
  })

  it('removes <style> tags after inlining non-media-query rules', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    // juice with removeStyleTags:true removes the <style> block;
    // any retained <style> only contains preserved @media rules
    const allStyleTags = result.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []
    const nonMediaStyleTags = allStyleTags.filter((tag) => !tag.includes('@media'))
    expect(nonMediaStyleTags).toHaveLength(0)
  })

  it('preserves @media queries in a retained <style> block', async () => {
    const result = await renderEmail(SimpleComponent, defaultProps)
    // The mocked CSS contains an @media rule; juice with preserveMediaQueries:true
    // keeps it in a retained <style> block even after removeStyleTags
    expect(result).toContain('@media')
  })

  it('renders correctly with all required props', async () => {
    const props: EmailTemplateProps = {
      siteName: 'MySite',
      publicName: 'Bob',
      contentBody: '<p>Hello Bob!</p>',
      callToActionLabel: 'Click Me',
      callToActionUrl: 'https://example.com/action',
    }
    const result = await renderEmail(SimpleComponent, props)
    expect(result).toContain('Bob')
    expect(result).toContain('https://example.com/action')
    expect(result).toContain('Click Me')
  })

  it('renders correctly when optional footer prop is omitted', async () => {
    const props: EmailTemplateProps = {
      siteName: 'MySite',
      publicName: 'Carol',
      contentBody: '<p>No footer here.</p>',
      callToActionLabel: 'Go',
      callToActionUrl: 'https://example.com',
    }
    const result = await renderEmail(SimpleComponent, props)
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })
})
