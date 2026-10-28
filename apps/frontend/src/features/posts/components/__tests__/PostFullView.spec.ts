import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const replaceMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))

// PostCard's import chain (messaging → media encoder) needs Worker, absent in jsdom.
vi.mock('../PostCard.vue', () => ({
  default: { props: ['post'], template: '<div class="post-card-stub">{{ post.id }}</div>' },
}))

import PostFullView from '../PostFullView.vue'

const post = { id: 'post-1', kind: 'post' as const, type: 'OFFER' } as any

const globalConfig = {
  stubs: {
    BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  },
  mocks: { $t: (k: string) => k },
}

describe('PostFullView', () => {
  it('renders the post card with a close button', () => {
    const wrapper = mount(PostFullView, { props: { post }, global: globalConfig })
    expect(wrapper.find('.post-card-stub').text()).toBe('post-1')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('navigates back to Browse when no detailPanelClose provider', async () => {
    replaceMock.mockClear()
    const wrapper = mount(PostFullView, { props: { post }, global: globalConfig })
    await wrapper.find('button').trigger('click')
    expect(replaceMock).toHaveBeenCalledWith({ name: 'Browse' })
  })

  it('omits the close button when hideClose is set', () => {
    const wrapper = mount(PostFullView, {
      props: { post, hideClose: true },
      global: globalConfig,
    })
    expect(wrapper.find('.post-card-stub').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
