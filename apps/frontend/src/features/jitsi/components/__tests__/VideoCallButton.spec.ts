import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../JitsiModalBVN.vue', () => ({ default: { template: '<div />' } }))
const mockStore = {
  makePublicRoomName: vi.fn().mockReturnValue('room'),
  createMeeting: vi.fn().mockResolvedValue({ id: '1', room: 'room' }),
  currentMeeting: null,
}
vi.mock('../../stores/jitsi', () => ({
  useJitsiStore: () => mockStore,
}))
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ profileId: 'me' }),
}))

import VideoCallButton from '../VideoCallButton.vue'

describe('VideoCallButton', () => {
  it('creates meeting on click', async () => {
    const wrapper = mount(VideoCallButton, {
      props: { targetProfileId: 'b' },
      global: {
        stubs: {
          BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    })
    await wrapper.find('button').trigger('click')
    expect(mockStore.createMeeting).toHaveBeenCalled()
  })
})
