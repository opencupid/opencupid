import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import photoEmptyUrl from '@/assets/images/app/photo-empty.svg?url'
import EmptyProfilePhoto from '../components/EmptyProfilePhoto.vue'

describe('EmptyProfilePhoto', () => {
  it('renders the silhouette as a decorative image', () => {
    const img = mount(EmptyProfilePhoto).find('img[data-testid="empty-profile-photo"]')
    expect(img.attributes('src')).toBe(photoEmptyUrl)
    expect(img.attributes('alt')).toBe('')
  })

  it('forwards caller classes and the load event', async () => {
    const wrapper = mount(EmptyProfilePhoto, { attrs: { class: 'rounded' } })
    expect(wrapper.classes()).toContain('rounded')
    await wrapper.trigger('load')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })
})
