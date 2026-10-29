// Clean message content for email/notification display
// Strips markdown syntax, collapses whitespace, and truncates
export function cleanMessageForNotification(content: string, maxLength: number = 100): string {
  let cleaned = content
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1') // *italic*
    .replace(/__(.+?)__/g, '$1') // __bold__
    .replace(/_(.+?)_/g, '$1') // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)

  // Loop tag stripping to handle nested fragments like <scr<script>ipt>
  let prev = ''
  while (prev !== cleaned) {
    prev = cleaned
    cleaned = cleaned.replace(/<[^>]*>/g, '')
  }

  cleaned = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  // Truncate at maxLength chars, breaking at word boundary
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength)
    // Find last space to break at word boundary
    const lastSpace = cleaned.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.8) {
      // Only break at word if we're close enough
      cleaned = cleaned.substring(0, lastSpace)
    }
    cleaned += '...'
  }

  return cleaned
}
