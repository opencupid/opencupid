import { describe, it, expect } from 'vitest'
import { blurhashToDataUrl } from '../composables/useBlurhashDataUrl'

describe('blurhashToDataUrl', () => {
  it('returns a data URL string', () => {
    const result = blurhashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(result).toMatch(/^data:image\/png/)
  })

  it('accepts custom dimensions', () => {
    const result = blurhashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 16, 16)
    expect(result).toMatch(/^data:image\/png/)
  })
})
