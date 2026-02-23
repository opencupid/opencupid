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
})
