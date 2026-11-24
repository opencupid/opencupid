import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTrack = vi.hoisted(() => vi.fn())
vi.mock('@/lib/umami', () => ({ tracker: { track: mockTrack } }))
vi.mock('@/assets/icons/interface/play.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/pause.svg', () => ({ default: { template: '<svg />' } }))

import VoiceMessage from '../components/VoiceMessage.vue'

describe('VoiceMessage', () => {
  const mockAttachment = {
    id: 'att-1',
    url: 'https://example.com/voice/test.webm',
    mimeType: 'audio/webm',
    fileSize: 2543,
    duration: 3,
    createdAt: new Date('2026-02-23T13:20:59Z'),
  }

  it('uses preload="auto" to ensure cross-browser playback compatibility', () => {
    const wrapper = mount(VoiceMessage, {
      props: { attachment: mockAttachment },
    })
    const audio = wrapper.find('audio')
    expect(audio.attributes('preload')).toBe('auto')
  })

  it('sets audio src directly from attachment url', () => {
    const wrapper = mount(VoiceMessage, {
      props: { attachment: mockAttachment },
    })
    const audio = wrapper.find('audio')
    expect(audio.attributes('src')).toBe(mockAttachment.url)
    expect(wrapper.find('source').exists()).toBe(false)
  })

  it('displays server-provided duration', () => {
    const wrapper = mount(VoiceMessage, {
      props: { attachment: mockAttachment },
    })
    expect(wrapper.text()).toContain('0:03')
  })

  describe('analytics', () => {
    beforeEach(() => {
      mockTrack.mockClear()
      vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    })

    it('tracks voice-message-played once per message, not on every play', async () => {
      const wrapper = mount(VoiceMessage, {
        props: { attachment: mockAttachment, isMine: false },
        global: {
          stubs: {
            BButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          },
        },
      })
      await wrapper.find('audio').trigger('loadeddata')
      const button = wrapper.find('.voice-play-btn')

      await button.trigger('click') // play
      await button.trigger('click') // pause
      await button.trigger('click') // play again

      expect(mockTrack).toHaveBeenCalledTimes(1)
      expect(mockTrack).toHaveBeenCalledWith('voice-message-played', { mine: false })
    })
  })
})
