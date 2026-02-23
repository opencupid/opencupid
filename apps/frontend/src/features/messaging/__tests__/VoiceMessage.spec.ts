import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
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

  it('sets correct source type from attachment mimeType', () => {
    const wrapper = mount(VoiceMessage, {
      props: { attachment: mockAttachment },
    })
    const source = wrapper.find('source')
    expect(source.attributes('type')).toBe('audio/webm')
    expect(source.attributes('src')).toBe(mockAttachment.url)
  })

  it('strips codec suffix from mimeType for source type', () => {
    const wrapper = mount(VoiceMessage, {
      props: {
        attachment: { ...mockAttachment, mimeType: 'audio/webm;codecs=opus' },
      },
    })
    const source = wrapper.find('source')
    expect(source.attributes('type')).toBe('audio/webm')
  })

  it('displays server-provided duration', () => {
    const wrapper = mount(VoiceMessage, {
      props: { attachment: mockAttachment },
    })
    expect(wrapper.text()).toContain('0:03')
  })
})
