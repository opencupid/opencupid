import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import PhotoFaceWarning from '../components/PhotoFaceWarning.vue'

describe('PhotoFaceWarning', () => {
  it('uses the no-photo wording when the gallery is empty', () => {
    const wrapper = mount(PhotoFaceWarning, { props: { hasPhoto: false } })
    expect(wrapper.text()).toContain('onboarding.photos_missing_warning')
  })

  it('uses the no-face wording when the gallery has photos', () => {
    const wrapper = mount(PhotoFaceWarning, { props: { hasPhoto: true } })
    expect(wrapper.text()).toContain('onboarding.photos_no_face_warning')
  })

  it('renders the actions slot when given', () => {
    const wrapper = mount(PhotoFaceWarning, {
      props: { hasPhoto: true },
      slots: { actions: '<button class="act">x</button>' },
    })
    expect(wrapper.find('.act').exists()).toBe(true)
  })
})
