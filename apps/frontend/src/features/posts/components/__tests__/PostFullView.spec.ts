import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ profileId: 'profile-1' }),
}))

import PostFullView from '../PostFullView.vue'

const stubs = {
  PostCard: {
    props: ['post'],
    template: `
      <div>
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
})
