import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/messaging/SendMessage.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))

import ActionButtons from '../ActionButtons.vue'

describe('ActionButtons', () => {
  it('opens modal when no conversation', async () => {
    const wrapper = mount(ActionButtons, {
      props: { profile: { conversation: null } as any },
      global: { stubs: { BButton: { template: '<button><slot /></button>' }, BModal: true, ProfileThumbnail: { template: '<div />' } } }
    })
    await wrapper.find('button').trigger('click')
    expect((wrapper.vm as any).showMessageModal).toBe(true)
  })
})
