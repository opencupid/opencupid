import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:blur/${hash}`,
}))

import { renderHiddenProfileMarkerHtml } from '../profileMarkerIcon'

const base = { isSelected: false, isHighlighted: false }

describe('renderHiddenProfileMarkerHtml', () => {
  it('renders the blurhash without an icon, never the photo URL', () => {
    const html = renderHiddenProfileMarkerHtml({
      ...base,
      image: { url: '/secret-photo.webp', blurhash: 'L0' },
    })
    expect(html).not.toContain('/secret-photo.webp')
    expect(html).toContain('data:blur/L0')
    expect(html).toContain('poi-avatar-hidden')
    expect(html).not.toContain('<svg')
  })

  it('renders photo-hidden.svg for a profile without a photo', () => {
    const html = renderHiddenProfileMarkerHtml({ ...base, image: undefined })
    expect(html).toContain('<img')
    expect(html).not.toContain('poi-avatar-hidden')
  })
})
