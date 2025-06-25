import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import UploadButton from '../components/UploadButton.vue'

describe('UploadButton', () => {
  it('emits file:change on input', async () => {
    const wrapper = mount(UploadButton, {
      global: {
        stubs: {
          BFormFile: {
            template: '<input @change="$emit(\'change\', $event)" />',
          },
        },
      },
    })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('file:change')).toBeTruthy()
  })
})
