import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ profileId: 'profile-1' }),
}))
vi.mock('@/features/publicprofile/components/SendMessageDialog.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/messaging/components/SendMessageForm.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/publicprofile/composables/useMessageSentState', () => ({
  useMessageSentState: () => ({
    messageSent: { value: false },
    handleMessageSent: () => {},
    resetMessageSent: () => {},
  }),
}))

vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/unhide.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/delete.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/pencil-2.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<span />' } }))

import OwnerToolbar from '../OwnerToolbar.vue'

const stubs = {
  BButton: {
    props: ['title'],
    template: '<button :title="title" @click="$emit(\'click\')"><slot /></button>',
  },
}

describe('OwnerToolbar', () => {
  it('uses Hide title when post is visible', () => {
    const wrapper = mount(OwnerToolbar, {
      props: { isVisible: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[2]!.attributes('title')).toBe('posts.actions.hide')
  })

  it('uses Show title when post is hidden', () => {
    const wrapper = mount(OwnerToolbar, {
      props: { isVisible: false },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[2]!.attributes('title')).toBe('posts.actions.show')
  })
})
