import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/emojis/smiling-emoji.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('../ConfirmPassDialog.vue', () => ({
  default: { template: '<div />' },
}))

// Stub AnonymousToggle so tests can drive its `change` event directly
// without depending on its internal markup or i18n.
vi.mock('../AnonymousToggle.vue', () => ({
  default: {
    props: ['selectedAnonymous'],
    emits: ['change'],
    template:
      '<div class="anonymous-toggle-stub">' +
      '<button class="toggle-anon" @click="$emit(\'change\', true)" /> ' +
      '<button class="toggle-revealed" @click="$emit(\'change\', false)" />' +
      '</div>',
  },
}))

import InteractionButtons from '../InteractionButtons.vue'
import type { InteractionContext } from '@zod/interaction/interactionContext.dto'

const baseContext: InteractionContext = {
  likedByMe: false,
  isAnonymous: true,
  likedMeRevealed: false,
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
  it('emits like(true) when the anonymous toggle is clicked in the create-like popover', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext }))

    await wrapper.find('.toggle-anon').trigger('click')

    expect(wrapper.emitted('like')).toEqual([[true]])
  })

  it('emits like(false) when the revealed toggle is clicked in the create-like popover', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext }))

    await wrapper.find('.toggle-revealed').trigger('click')

    expect(wrapper.emitted('like')).toEqual([[false]])
  })

  it('does not emit like when canLike is false', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, canLike: false }))

    await wrapper.find('.toggle-anon').trigger('click')

    expect(wrapper.emitted('like')).toBeUndefined()
  })

  it('emits update:anonymous when toggling anonymity on an already-liked profile', async () => {
    const wrapper = mount(
      InteractionButtons,
      mountOpts({ ...baseContext, likedByMe: true, isAnonymous: true, canLike: false })
    )

    // already liked: toggling to revealed should emit update:anonymous(false)
    await wrapper.find('.toggle-revealed').trigger('click')

    expect(wrapper.emitted('update:anonymous')).toEqual([[false]])
    // should NOT emit a new like
    expect(wrapper.emitted('like')).toBeUndefined()
  })

  it('does not emit update:anonymous when the chosen value matches current isAnonymous', async () => {
    const wrapper = mount(
      InteractionButtons,
      mountOpts({ ...baseContext, likedByMe: true, isAnonymous: true, canLike: false })
    )

    await wrapper.find('.toggle-anon').trigger('click')

    expect(wrapper.emitted('update:anonymous')).toBeUndefined()
  })

  it('emits like when "like back" button is clicked (they liked me, revealed)', async () => {
    const wrapper = mount(
      InteractionButtons,
      mountOpts({ ...baseContext, likedMeRevealed: true, isAnonymous: false })
    )

    // The popover trigger renders with .btn-like; the actual "like back"
    // action button inside the popover body is the only .btn-like-back in
    // the tree, so it disambiguates cleanly.
    const likeBackBtn = wrapper.find('.btn-like-back')
    await likeBackBtn.trigger('click')

    expect(wrapper.emitted('like')).toEqual([[false]])
  })

  it('emits message when message button is clicked and canMessage is true', async () => {
    const wrapper = mount(InteractionButtons, mountOpts({ ...baseContext, canMessage: true }))

    const msgBtn = wrapper.find('.btn-info')
    await msgBtn.trigger('click')

    expect(wrapper.emitted('message')).toHaveLength(1)
  })

  it('shows confirmation popover when pass is clicked after already liking', async () => {
    // Pass button is only rendered when likedByMe=true; clicking it opens a
    // confirmation dialog instead of emitting 'pass' directly.
    const wrapper = mount(
      InteractionButtons,
      mountOpts({ ...baseContext, likedByMe: true, canLike: false })
    )

    const passBtn = wrapper.find('[title="interactions.pass_button_title"]')
    await passBtn.trigger('click')

    // 'pass' is NOT emitted directly — confirmation dialog is shown first
    expect(wrapper.emitted('pass')).toBeUndefined()
  })
})
