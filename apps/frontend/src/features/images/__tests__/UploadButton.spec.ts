import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

import UploadButton from '../components/UploadButton.vue'

vi.mock('@/assets/icons/files/avatar-upload.svg', () => ({ default: { name: 'AvatarUploadIcon' } }))
vi.mock('@/assets/icons/interface/camera.svg', () => ({ default: { name: 'IconCamera2' } }))

describe('UploadButton', () => {
  it('emits file:change on input', async () => {
    const wrapper = mount(UploadButton, {
      global: {
        stubs: {
          BFormFile: {
            template: '<input @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('file:change')).toBeTruthy()
  })

  it('renders a static title on the label when buttonTitle is provided', () => {
    const wrapper = mount(UploadButton, {
      props: { buttonTitle: 'Attach image' },
      global: {
        stubs: {
          BFormFile: { template: '<input />' },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    // The static title replaces the browser's native filename tooltip on the
    // visually-hidden file input.
    expect(wrapper.find('label').attributes('title')).toBe('Attach image')
  })

  it('renders #button slot content when no capture is set', () => {
    const wrapper = mount(UploadButton, {
      slots: { button: '<span class="slotted-icon" />' },
      global: {
        stubs: {
          BFormFile: { template: '<input />' },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    expect(wrapper.find('.slotted-icon').exists()).toBe(true)
  })

  it('falls back to AvatarUploadIcon when #button slot is not provided', () => {
    const wrapper = mount(UploadButton, {
      global: {
        stubs: {
          BFormFile: { template: '<input />' },
          AvatarUploadIcon: { template: '<span class="avatar-upload-icon" />' },
          IconCamera2: true,
        },
      },
    })
    expect(wrapper.find('.avatar-upload-icon').exists()).toBe(true)
  })

  it('renders the camera icon (ignoring #button slot) when capture is set', () => {
    const wrapper = mount(UploadButton, {
      props: { capture: 'user' },
      slots: { button: '<span class="slotted-icon" />' },
      global: {
        stubs: {
          BFormFile: { props: ['capture'], template: '<input :capture="capture" />' },
          AvatarUploadIcon: true,
          IconCamera2: { template: '<span class="camera-icon" />' },
        },
      },
    })
    // capture intent always wins — the slot is bypassed for the camera path.
    expect(wrapper.find('.camera-icon').exists()).toBe(true)
    expect(wrapper.find('.slotted-icon').exists()).toBe(false)
  })

  it('applies capture attribute when capture prop is provided', () => {
    const wrapper = mount(UploadButton, {
      props: {
        capture: 'user',
      },
      global: {
        stubs: {
          BFormFile: {
            props: ['capture'],
            template: '<input :capture="capture" @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('capture')).toBe('user')
  })

  it('applies environment capture attribute when specified', () => {
    const wrapper = mount(UploadButton, {
      props: {
        capture: 'environment',
      },
      global: {
        stubs: {
          BFormFile: {
            props: ['capture'],
            template: '<input :capture="capture" @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('capture')).toBe('environment')
  })

  it('does not apply capture attribute when capture prop is not provided', () => {
    const wrapper = mount(UploadButton, {
      global: {
        stubs: {
          BFormFile: {
            props: ['capture'],
            template: '<input :capture="capture" @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('capture')).toBeUndefined()
  })

  // Firefox on Android only honors `capture` when `accept` lists media MIME
  // types — file extensions like `.jpg` are ignored and fall back to the
  // gallery picker. See issue #234.
  it('uses MIME-type accept values so capture works in Firefox/Android', () => {
    const wrapper = mount(UploadButton, {
      props: { capture: 'user' },
      global: {
        stubs: {
          BFormFile: {
            props: ['accept', 'capture'],
            template: '<input :accept="accept" :capture="capture" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
        },
      },
    })
    const accept = wrapper.find('input').attributes('accept') ?? ''
    const acceptedMimeTypes = accept
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .sort()

    expect(acceptedMimeTypes).toEqual(['image/jpeg', 'image/png'])
  })
})
