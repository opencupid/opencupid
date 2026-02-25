import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'
import { renderMessage, stripForPreview } from '../renderMessage'

describe('renderMessage', () => {
  it('renders bold text', () => {
    expect(renderMessage('**hello**')).toContain('<strong>hello</strong>')
  })

  it('renders italic text', () => {
    expect(renderMessage('*hello*')).toContain('<em>hello</em>')
  })

  it('renders links from markdown syntax', () => {
    const html = renderMessage('[click](https://example.com)')
    expect(html).toContain('<a ')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('click</a>')
  })

  it('auto-links URLs', () => {
    const html = renderMessage('visit https://example.com today')
    expect(html).toContain('<a ')
    expect(html).toContain('href="https://example.com"')
  })

  it('converts newlines to <br>', () => {
    const html = renderMessage('line1\nline2')
    expect(html).toContain('<br>')
  })

  it('escapes script tags (html disabled in parser)', () => {
    const html = renderMessage('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    // markdown-it escapes to &lt;script&gt; which is safe text
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes img tags (html disabled in parser)', () => {
    const html = renderMessage('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
  })

  it('does not parse javascript: URIs as links', () => {
    const html = renderMessage('[click](javascript:alert(1))')
    // markdown-it rejects javascript: URIs — renders as plain text, not as <a>
    expect(html).not.toContain('<a ')
  })

  it('DOMPurify strips disallowed tags from output', () => {
    // Even if somehow HTML got through, DOMPurify would strip it
    const html = DOMPurify.sanitize('<div><script>x</script><strong>ok</strong></div>', {
      ALLOWED_TAGS: ['strong', 'em', 'br', 'a', 'p'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<div>')
    expect(html).toContain('<strong>ok</strong>')
  })

  it('DOMPurify strips event handlers from allowed tags', () => {
    const html = DOMPurify.sanitize('<a href="https://ok.com" onclick="alert(1)">link</a>', {
      ALLOWED_TAGS: ['strong', 'em', 'br', 'a', 'p'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    })
    expect(html).not.toContain('onclick')
    expect(html).toContain('href="https://ok.com"')
  })

  it('handles combined markdown', () => {
    const html = renderMessage('**bold** and *italic* with [link](https://x.com)\nnew line')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<a ')
    expect(html).toContain('<br>')
  })

  it('escapes raw HTML typed by user', () => {
    const html = renderMessage('<div>not allowed</div>')
    expect(html).not.toContain('<div>')
    expect(html).toContain('&lt;div&gt;')
  })

  it('handles plain text without markdown', () => {
    const html = renderMessage('just a normal message')
    expect(html).toContain('just a normal message')
  })
})

describe('stripForPreview', () => {
  it('strips bold markdown', () => {
    expect(stripForPreview('**bold** text')).toBe('bold text')
  })

  it('strips italic markdown', () => {
    expect(stripForPreview('*italic* text')).toBe('italic text')
  })

  it('strips link markdown, keeping text', () => {
    expect(stripForPreview('[click here](https://example.com)')).toBe('click here')
  })

  it('replaces newlines with spaces', () => {
    expect(stripForPreview('line1\nline2')).toBe('line1 line2')
  })

  it('strips HTML tags', () => {
    expect(stripForPreview('<b>Bold</b> and <i>italic</i>')).toBe('Bold and italic')
  })

  it('collapses whitespace', () => {
    expect(stripForPreview('hello   \n   world')).toBe('hello world')
  })
})
