import { describe, expect, it } from 'vitest'
import type { PublicTag } from '@zod/tag/tag.dto'
import { tagsDataAttr } from '../contentTags'

const tag = (slug: string): PublicTag => ({ id: `id-${slug}`, name: slug, slug })

describe('tagsDataAttr', () => {
  it('joins tag slugs with a single space', () => {
    expect(tagsDataAttr([tag('hiking'), tag('live-music')])).toBe('hiking live-music')
  })

  it('returns an empty string for no tags', () => {
    expect(tagsDataAttr([])).toBe('')
  })
})
