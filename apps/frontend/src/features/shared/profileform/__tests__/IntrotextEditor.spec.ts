import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/store/i18nStore', () => ({ useI18nStore: () => ({ getLanguage: () => 'en' }) }))
vi.mock('@/assets/icons/interface/mic-2.svg', () => ({ default: { template: '<div />' } }))



vi.mock('@/assets/icons/interface/globe.svg', () => ({ default: { template: '<div />' } }))

import IntrotextEditor from '../IntrotextEditor.vue'

describe('IntrotextEditor', () => {
  it('updates status when speech not supported', () => {
    const wrapper = mount(IntrotextEditor, { props: { languages: ['en'], placeholder: 'blah' }, global: { stubs: { BFormTextarea: true, BFormFloatingLabel: true, BButton: true } } })
      ; (wrapper.vm as any).toggleListening()
    expect((wrapper.vm as any).status).toBe('SpeechRecognition not supported')
  })
})
