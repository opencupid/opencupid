import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({
  default: { template: '<span />' },
}))

import ConversationNotFound from '../ConversationNotFound.vue'

function mountView() {
  return mount(ConversationNotFound, {
    global: { mocks: { $t: (key: string) => key } },
  })
}

describe('ConversationNotFound', () => {
  it('explains that the conversation does not exist', () => {
    expect(mountView().text()).toContain('messaging.conversation_not_found')
  })

  it('goes back to the inbox or closes the drawer', async () => {
    const wrapper = mountView()

    await wrapper.find('[role="button"]').trigger('click')
    await wrapper.find('.btn-close').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
