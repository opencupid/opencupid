import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ profileId: 'profile-1' }),
}))
vi.mock('@/features/publicprofile/composables/useMessageSentState', () => ({
  useMessageSentState: () => ({
    messageSent: ref(false),
    handleMessageSent: vi.fn(),
    resetMessageSent: vi.fn(),
  }),
}))
vi.mock('@/features/messaging/components/SendMessageForm.vue', () => ({
  default: { template: '<div class="message-form" />' },
}))
vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<span />' },
}))

import PostFullView from '../PostFullView.vue'

const stubs = {
  PostCard: {
    props: ['post'],
    template: `
      <div>
        <button class="contact" @click="$emit('contact')">contact</button>
        <button class="edit" @click="$emit('edit')">edit</button>
        <button class="hide" @click="$emit('hide')">hide</button>
        <button class="delete" @click="$emit('delete')">delete</button>
      </div>
    `,
  },
}

describe('PostFullView', () => {
  const post = {
    id: 'post-1',
    postedById: 'profile-1',
    type: 'OFFER',
    content: 'test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedBy: {
      id: 'profile-2',
      publicName: 'Recipient',
      profileImages: [],
    },
  } as any

  it('forwards hide intent with current post payload', async () => {
    const wrapper = mount(PostFullView, {
      props: { post },
      global: { stubs },
    })

    await wrapper.find('button.hide').trigger('click')

    expect(wrapper.emitted('hide')).toBeTruthy()
    expect(wrapper.emitted('hide')?.[0]?.[0]).toEqual(post)
  })

  it('forwards delete intent with current post payload', async () => {
    const wrapper = mount(PostFullView, {
      props: { post },
      global: { stubs },
    })

    await wrapper.find('button.delete').trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')?.[0]?.[0]).toEqual(post)
  })

  it('shows inline send message form when contact is clicked', async () => {
    const wrapper = mount(PostFullView, {
      props: { post },
      global: { stubs },
    })

    expect(wrapper.find('.message-form').exists()).toBe(false)
    await wrapper.find('button.contact').trigger('click')
    await nextTick()

    expect(wrapper.find('.message-form').exists()).toBe(true)
  })
})
