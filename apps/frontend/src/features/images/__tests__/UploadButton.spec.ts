import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

import UploadButton from '../components/UploadButton.vue'

vi.mock('@/assets/icons/files/avatar-upload.svg', () => ({ default: { name: 'AvatarUploadIcon' } }))
vi.mock('@/assets/icons/interface/camera.svg', () => ({ default: { name: 'IconCamera2' } }))
vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { name: 'IconPhoto' } }))

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
          IconPhoto: true,
        },
      },
    })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('file:change')).toBeTruthy()
  })

  it('applies capture attribute when capture prop is provided', () => {
    const wrapper = mount(UploadButton, {
      props: {
        capture: 'user'
      },
      global: {
        stubs: {
          BFormFile: {
            props: ['capture'],
            template: '<input :capture="capture" @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
          IconPhoto: true,
        },
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('capture')).toBe('user')
  })

  it('applies environment capture attribute when specified', () => {
    const wrapper = mount(UploadButton, {
      props: {
        capture: 'environment'
      },
      global: {
        stubs: {
          BFormFile: {
            props: ['capture'],
            template: '<input :capture="capture" @change="$emit(\'change\', $event)" />',
          },
          AvatarUploadIcon: true,
          IconCamera2: true,
          IconPhoto: true,
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
          IconPhoto: true,
        },
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('capture')).toBeUndefined()
  })
})
