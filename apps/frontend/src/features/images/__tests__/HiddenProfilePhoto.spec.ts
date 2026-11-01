import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import HiddenProfilePhoto from '../components/HiddenProfilePhoto.vue'

describe('HiddenProfilePhoto', () => {
  it('renders the placeholder image with an explanatory label', () => {
    const wrapper = mount(HiddenProfilePhoto, { props: { className: 'rounded' } })
    const img = wrapper.find('img')
    expect(img.attributes('src')).toBeTruthy()
    expect(img.attributes('alt')).toBe('profiles.photo_hidden')
    expect(img.classes()).toContain('rounded')
  })

  it('emits load when the placeholder has loaded', async () => {
    const wrapper = mount(HiddenProfilePhoto)
    await wrapper.find('img').trigger('load')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })
})
