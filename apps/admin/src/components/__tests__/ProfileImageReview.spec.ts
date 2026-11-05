import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const apiRequestMock = vi.fn()
vi.mock('../../composables/useApi', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}))

import ProfileImageReview, { type AdminProfileImage } from '../ProfileImageReview.vue'

function image(id: string, hasFace: boolean, position: number): AdminProfileImage {
  return {
    id,
    hasFace,
    position,
    variants: [
      { size: 'thumb', url: `https://media/${id}-thumb.webp` },
      { size: 'card', url: `https://media/${id}-card.webp` },
    ],
  }
}

function mountReview(props: Partial<{ images: AdminProfileImage[]; hasFace: boolean }> = {}) {
  return mount(ProfileImageReview, {
    props: {
      profileId: 'p1',
      images: [image('a', true, 0), image('b', false, 1)],
      hasFace: true,
      ...props,
    },
  })
}

describe('ProfileImageReview', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('renders the primary photo large and the rest as small thumbnails', () => {
    const wrapper = mountReview()
    const thumbs = wrapper.findAll('.image-review-thumb')
    expect(thumbs).toHaveLength(2)
    expect(thumbs[0]!.classes()).toContain('is-primary')
    expect(thumbs[1]!.classes()).not.toContain('is-primary')
    expect(thumbs[0]!.attributes('src')).toBe('https://media/a-thumb.webp')
  })

  it('shows the card variant as the hover preview', () => {
    const wrapper = mountReview()
    const previews = wrapper.findAll('.image-review-preview')
    expect(previews.map((p) => p.attributes('src'))).toEqual([
      'https://media/a-card.webp',
      'https://media/b-card.webp',
    ])
  })

  it('marks each thumbnail with its hasFace halo', () => {
    const wrapper = mountReview()
    const thumbs = wrapper.findAll('.image-review-thumb')
    expect(thumbs[0]!.classes()).toContain('has-face')
    expect(thumbs[1]!.classes()).toContain('no-face')
  })

  it('shows an empty state without photos', () => {
    const wrapper = mountReview({ images: [] })
    expect(wrapper.text()).toContain('No photos.')
    expect(wrapper.find('[data-testid="profile-has-face"]').exists()).toBe(true)
  })

  it('reflects and saves the profile hasFace override', async () => {
    apiRequestMock.mockResolvedValue({ success: true })
    const wrapper = mountReview({ hasFace: true })
    const box = wrapper.get<HTMLInputElement>('[data-testid="profile-has-face"]')
    expect(box.element.checked).toBe(true)

    await box.setValue(false)
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/profiles/p1', {
      method: 'PATCH',
      body: { hasFace: false },
    })
    expect(wrapper.emitted('update:hasFace')).toEqual([[false]])
  })

  it('reverts the checkbox and shows the error when saving fails', async () => {
    apiRequestMock.mockRejectedValue(new Error('boom'))
    const wrapper = mountReview({ hasFace: false })
    const box = wrapper.get<HTMLInputElement>('[data-testid="profile-has-face"]')

    await box.setValue(true)
    await flushPromises()

    expect(box.element.checked).toBe(false)
    expect(wrapper.emitted('update:hasFace')).toBeUndefined()
    expect(wrapper.text()).toContain('boom')
  })
})
