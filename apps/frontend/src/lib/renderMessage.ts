import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = MarkdownIt('zero', { linkify: true, breaks: true }).enable([
  'emphasis',
  'link',
  'linkify',
  'newline',
  'text',
  'paragraph',
])

// Open links in new tab
const defaultRender =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank')
  tokens[idx]!.attrSet('rel', 'noopener noreferrer')
  return defaultRender(tokens, idx, options, env, self)
}

/** Render user message content as sanitized HTML with bold, italic, and links. */
export function renderMessage(content: string): string {
  const html = md.render(content)
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'br', 'a', 'p'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

/** Strip markdown and HTML for plain-text previews (conversation list, etc.) */
export function stripForPreview(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1') // *italic*
    .replace(/__(.+?)__/g, '$1') // __bold__
    .replace(/_(.+?)_/g, '$1') // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)
    .replace(/<[^>]+>/g, '') // strip any HTML tags
    .replace(/\n/g, ' ') // newlines to spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}
