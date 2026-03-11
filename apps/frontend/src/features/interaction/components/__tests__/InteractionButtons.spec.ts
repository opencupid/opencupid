import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@/assets/icons/interface/heart.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<span />' },
}))

import InteractionButtons from '../InteractionButtons.vue'
import type { InteractionContext } from '@zod/interaction/interactionContext.dto'

const baseContext: InteractionContext = {
  likedByMe: false,
  isAnonymous: true,
  isMatch: false,
  passedByMe: false,
  canLike: true,
  canPass: true,
  canDate: true,
  haveConversation: false,
  canMessage: true,
  conversationId: null,
  initiated: false,
}

const mountOpts = (context: InteractionContext) => ({
  props: { context },
  global: { mocks: { $t: (msg: string) => msg } },
})

describe('InteractionButtons', () => {
  it('emits like with selectedAnonymous value when like button is clicked', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, isAnonymous: true }))

    const likeBtn = wrapper.find('[title="interactions.like_button_title"]')
    await likeBtn.trigger('click')

    expect(wrapper.emitted('like')).toEqual([[true]])
  })

  it('emits like with isAnonymous=false when context starts revealed', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, isAnonymous: false }))

    const likeBtn = wrapper.find('[title="interactions.like_button_title"]')
    await likeBtn.trigger('click')

    expect(wrapper.emitted('like')).toEqual([[false]])
  })

  it('syncs selectedAnonymous when context.isAnonymous changes', async () => {
    const context = { ...baseContext, isAnonymous: true }
    const wrapper = mount(InteractionButtons, mountOpts(context))

    // Click like — should emit true (anonymous)
    const likeBtn = wrapper.find('[title="interactions.like_button_title"]')
    await likeBtn.trigger('click')
    expect(wrapper.emitted('like')![0]).toEqual([true])

    // Update context to revealed
    await wrapper.setProps({
      context: { ...context, isAnonymous: false, canLike: true },
    })
    await nextTick()

    // Click like again — should now emit false (revealed)
    await likeBtn.trigger('click')
    expect(wrapper.emitted('like')![1]).toEqual([false])
  })

  it('does not emit like when canLike is false', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, canLike: false }))

    const likeBtn = wrapper.find('[title="interactions.like_button_title"]')
    await likeBtn.trigger('click')

    expect(wrapper.emitted('like')).toBeUndefined()
  })

  it('emits message when message button is clicked and canMessage is true', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, canMessage: true }))

    const msgBtn = wrapper.find('[title="interactions.message_button_title"]')
    await msgBtn.trigger('click')

    expect(wrapper.emitted('message')).toHaveLength(1)
  })

  it('emits pass when pass button is clicked and not previously liked', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, likedByMe: false }))

    const passBtn = wrapper.find('[title="interactions.pass_button_title"]')
    await passBtn.trigger('click')

    expect(wrapper.emitted('pass')).toHaveLength(1)
  })
})
