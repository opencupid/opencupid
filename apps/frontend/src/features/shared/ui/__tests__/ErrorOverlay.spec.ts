import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/emojis/confused-emoji.svg', () => ({ default: { template: '<div />' } }))

import ErrorOverlay from '../ErrorOverlay.vue'

describe('ErrorOverlay', () => {
  it('displays error message', () => {
    const wrapper = mount(ErrorOverlay, { props: { error: 'Boom' } })
    expect(wrapper.text()).toContain('uicomponents.error.title')
    expect(wrapper.text()).toContain('Boom')
  })
})
