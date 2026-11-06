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
    expect(root.attributes('title')).toBe('profiles.photo_hidden_no_face')
    expect(wrapper.find('.blurhash-stub').exists()).toBe(true)
    expect(wrapper.find('.icon-hide').exists()).toBe(true)
  })

  it('puts the icon top-left by default and bottom-right on request', () => {
    const def = mount(HiddenProfilePhoto, { props: { photo: { blurhash: 'L0' } } })
    expect(def.find('.icon-hide').classes()).toContain('icon-top-left')
    const br = mount(HiddenProfilePhoto, {
      props: { photo: { blurhash: 'L0' }, iconCorner: 'bottom-right' },
    })
    expect(br.find('.icon-hide').classes()).toContain('icon-bottom-right')
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
})
