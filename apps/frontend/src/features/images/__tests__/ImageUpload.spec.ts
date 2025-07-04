import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('../components/UploadButton.vue', () => ({ default: { template: '<input @change="$emit(\'file:change\', $event)" />' } }))

import ImageUpload from '../components/ImageUpload.vue'

describe('ImageUpload', () => {
  it('emits file:change when a file is selected', async () => {
    const wrapper = mount(ImageUpload, {
      props: { modalState: 'chooser', preview: null, isLoading: false, error: null },
      global: { stubs: { BButton: true, BOverlay: true } }
    })
    await wrapper.find('input').trigger('change')
    expect(wrapper.emitted('file:change')).toBeTruthy()
  })
})
