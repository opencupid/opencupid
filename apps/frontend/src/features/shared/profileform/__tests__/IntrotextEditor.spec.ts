import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'en' } }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'en' } }),
  sortLanguagesWithDefaultFirst: (langs: string[]) => langs,
}))
vi.mock('@/store/i18nStore', () => ({ useI18nStore: () => ({ getLanguage: () => 'en' }) }))
vi.mock('@/assets/icons/interface/mic-2.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/question.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/composables/useLanguages', () => ({
  useLanguages: () => ({
    getLanguageLabels: (codes: string[]) =>
      codes.map((c) => ({
        value: c,
        label: c === 'en' ? 'English' : c === 'hu' ? 'Hungarian' : c,
      })),
  }),
}))
vi.mock('@/features/shared/profiledisplay/LanguageIcon.vue', () => ({
  default: { template: '<span class="language-icon" />' },
}))

import IntrotextEditor from '../IntrotextEditor.vue'

const stubs = {
  BFormTextarea: true,
  BFormFloatingLabel: true,
  BButton: true,
  BPopover: true,
}

describe('IntrotextEditor', () => {
  it('hides language chooser when only one language is provided', () => {
    const wrapper = mount(IntrotextEditor, {
      props: { languages: ['en'], placeholder: 'blah' },
      global: { stubs },
    })
    expect(wrapper.find('.nav-pills').exists()).toBe(false)
  })

  it('shows language chooser when multiple languages are provided', () => {
    const wrapper = mount(IntrotextEditor, {
      props: { languages: ['en', 'hu'], placeholder: 'blah' },
      global: { stubs },
    })
    expect(wrapper.find('.nav-pills').exists()).toBe(true)
  })

  it('shows full language name and flag in each tab', () => {
    const wrapper = mount(IntrotextEditor, {
      props: { languages: ['en', 'hu'], placeholder: 'blah' },
      global: { stubs },
    })
    const tabs = wrapper.findAll('.nav-item a')
    expect(tabs.at(0)?.text()).toContain('English')
    expect(tabs.at(1)?.text()).toContain('Hungarian')
    expect(wrapper.findAll('.language-icon').length).toBe(2)
  })
})
