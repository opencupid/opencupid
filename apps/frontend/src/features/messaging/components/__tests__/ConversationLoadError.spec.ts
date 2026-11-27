import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({
  default: { template: '<span />' },
}))

import ConversationLoadError from '../ConversationLoadError.vue'

function mountView(reason: 'not_found' | 'failed' = 'not_found') {
  return mount(ConversationLoadError, {
    props: { reason },
    global: { mocks: { $t: (key: string) => key } },
  })
}

describe('ConversationLoadError', () => {
  it('explains that the conversation does not exist', () => {
    expect(mountView('not_found').text()).toContain('messaging.conversation_not_found')
  })

  it('says loading failed when the request itself failed', () => {
    expect(mountView('failed').text()).toContain('messaging.conversation_load_failed')
  })

  it('goes back to the inbox or closes the drawer', async () => {
    const wrapper = mountView()

    await wrapper.find('button[type="button"]:not(.btn-close)').trigger('click')
    await wrapper.find('.btn-close').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
