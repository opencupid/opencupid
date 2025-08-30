import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useJitsiStore } from '../jitsi'

describe('jitsi store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('generates room name with profile ids', () => {
    const store = useJitsiStore()
    const name = store.makePublicRoomName('a', 'b')
    expect(name).toContain('a')
    expect(name).toContain('b')
  })

  it('creates meeting via fetch', async () => {
    const store = useJitsiStore()
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, meeting: { id: '1', room: 'r' } }),
    } as any)
    await store.createMeeting({ room: 'r', targetProfileId: 'b' })
    expect(store.currentMeeting?.id).toBe('1')
    expect((fetch as any).mock.calls[0][1].credentials).toBe('include')
  })
})
