import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../profiles/image/ProfileImage.vue', () => ({ default: { template: '<div />' } }))

import MessageReceivedToast from '../components/MessageReceivedToast.vue'

describe('MessageReceivedToast', () => {
  it('renders sender name from translation', () => {
    const t = vi.fn().mockImplementation((_k, args) => `msg from ${args.sender}`)
    const wrapper = mount(MessageReceivedToast, {
      props: { message: { sender: { publicName: 'Alice' } } as any, toastId: 1 },
      global: { mocks: { $t: t } }
    })
    expect(t).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Alice')
  })
})
