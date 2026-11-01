import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/hide.svg', () => ({
  default: { template: '<svg class="icon-hide" />' },
}))
vi.mock('../components/BlurhashCanvas.vue', () => ({
  default: { template: '<canvas class="blurhash-stub" />', props: ['blurhash'] },
}))

import HiddenProfilePhoto from '../components/HiddenProfilePhoto.vue'

describe('HiddenProfilePhoto', () => {
  it("shows the photo's blurhash under a crossed-eye icon", () => {
    const wrapper = mount(HiddenProfilePhoto, {
      props: { photo: { blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }, className: 'rounded' },
    })
    const root = wrapper.find('[data-testid="hidden-profile-photo"]')
    expect(root.exists()).toBe(true)
    expect(root.classes()).toContain('rounded')
    expect(wrapper.find('.blurhash-stub').exists()).toBe(true)
    expect(wrapper.find('.icon-hide').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-profile-photo"]').exists()).toBe(false)
  })

  it('shows only the crossed-eye icon when the photo has no blurhash', () => {
    const wrapper = mount(HiddenProfilePhoto, { props: { photo: { blurhash: null } } })
    expect(wrapper.find('.blurhash-stub').exists()).toBe(false)
    expect(wrapper.find('.icon-hide').exists()).toBe(true)
  })

  it('emits load on mount for the blurhash variant', () => {
    const wrapper = mount(HiddenProfilePhoto, { props: { photo: { blurhash: 'L0' } } })
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('shows photo-hidden.svg when the profile has no photo', async () => {
    const wrapper = mount(HiddenProfilePhoto)
    const img = wrapper.find('img[data-testid="no-profile-photo"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('profiles.photo_hidden')
    expect(wrapper.find('.icon-hide').exists()).toBe(false)

    await img.trigger('load')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })
})
