import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import { InteractionContextSchema } from '@zod/interaction/interactionContext.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: vi.fn(), error: vi.fn() }) }))

const context = ref<ReturnType<typeof InteractionContextSchema.parse> | undefined>()
vi.mock('../../composables/useInteractionsViewModel', () => ({
  useInteractionsViewModel: () => ({
    like: vi.fn(),
    pass: vi.fn(),
    updateLike: vi.fn(),
    refreshInteractions: vi.fn(),
    fetchContext: vi.fn(),
    contextFor: () => context,
  }),
}))

vi.mock('../InteractionButtons.vue', () => ({
  default: {
    name: 'InteractionButtons',
    emits: ['message'],
    template: '<button class="message" @click="$emit(\'message\')" />',
  },
}))
vi.mock('../MatchPopup.vue', () => ({ default: { template: '<div />' } }))

import ProfileInteractions from '../ProfileInteractions.vue'

const profile = { id: 'partner', publicName: 'Anna' } as unknown as PublicProfile

async function clickMessage(ctx: Record<string, unknown>) {
  context.value = InteractionContextSchema.parse(ctx)
  const wrapper = mount(ProfileInteractions, { props: { profile } })
  await wrapper.find('.message').trigger('click')
}

describe('ProfileInteractions — message button', () => {
  beforeEach(() => mockPush.mockClear())

  it('opens the draft for a first contact', async () => {
    await clickMessage({ canMessage: true })

    expect(mockPush).toHaveBeenCalledWith({
      name: 'ConversationNew',
      params: { profileId: 'partner' },
    })
  })

  it('opens the existing conversation', async () => {
    await clickMessage({ haveConversation: true, canMessage: true, conversationId: 'c1' })

    expect(mockPush).toHaveBeenCalledWith({
      name: 'Conversation',
      params: { conversationId: 'c1' },
    })
  })

  it('does nothing when the viewer cannot message', async () => {
    await clickMessage({ canMessage: false })

    expect(mockPush).not.toHaveBeenCalled()
  })
})
