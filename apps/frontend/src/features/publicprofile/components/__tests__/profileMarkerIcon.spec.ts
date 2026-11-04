import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:blur/${hash}`,
}))

vi.mock('@/assets/icons/interface/heart-filled.svg?raw', () => ({
  default: '<svg class="icon-heart"></svg>',
}))

import { renderHiddenProfileMarkerHtml, renderProfileMarkerHtml } from '../profileMarkerIcon'

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

describe('dating match marking', () => {
  const image = { url: '/photo.webp', blurhash: 'L0' }

  it('keeps the halo and adds a heart for a potential match', () => {
    const html = renderProfileMarkerHtml({ ...base, isHighlighted: true, image })
    expect(html).toContain('poi-avatar highlighted')
    expect(html).toContain('<div class="match-indicator"><svg class="icon-heart"></svg></div>')
  })

  it('marks hidden-photo markers the same way', () => {
    const html = renderHiddenProfileMarkerHtml({ ...base, isHighlighted: true, image })
    expect(html).toContain('highlighted')
    expect(html).toContain('match-indicator')
  })

  it('adds no heart to other profiles', () => {
    expect(renderProfileMarkerHtml({ ...base, image })).not.toContain('match-indicator')
  })
})
