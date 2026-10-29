import { describe, expect, it } from 'vitest'
import { cleanMessageForNotification } from '../../utils/notificationText'

describe('cleanMessageForNotification', () => {
  it('strips markdown, links and HTML, and collapses whitespace', () => {
    expect(cleanMessageForNotification('**Hi**  _there_\n[site](https://x.test) <b>!</b>')).toBe(
      'Hi there site !'
    )
  })

  it('leaves no tag opener behind for nested fragments', () => {
    expect(cleanMessageForNotification('a<scr<script>ipt>b')).not.toContain('<')
  })

  it('truncates at a word boundary with an ellipsis', () => {
    const out = cleanMessageForNotification('word '.repeat(40), 20)
    expect(out.endsWith('...')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(23)
  })
})
