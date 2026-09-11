import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/features/shared/composables/useLanguages', () => ({
  useLanguages: () => ({
    getLanguageLabels: (codes: string[]) => codes.map((c) => ({ value: c, label: c })),
  }),
}))

vi.mock('@/assets/icons/interface/unhide.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/globe.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/features/shared/profiledisplay/LanguageIcon.vue', () => ({
  default: { template: '<span />' },
}))

import ViewAsDropdown from '../ViewAsDropdown.vue'

const globalConfig = {
  stubs: {
    BDropdown: { template: '<div><slot name="button-content" /><slot :hide="() => {}" /></div>' },
    BDropdownText: { template: '<div><slot /></div>' },
    BDropdownDivider: { template: '<div />' },
    BDropdownItemButton: { template: '<button><slot /></button>' },
    BDropdownGroup: { template: '<div><slot /></div>' },
    BFormCheckbox: { template: '<input type="checkbox" />' },
  },
  mocks: { $t: (k: string) => k },
}

describe('ViewAsDropdown', () => {
  it('renders without crashing when viewerProfile ref holds null', () => {
    const wrapper = mount(ViewAsDropdown, {
      props: {
        modelValue: {
          isEditable: false,
          currentScope: 'social',
          previewLanguage: 'en',
          scopes: ['social'],
        },
        isDatingActive: false,
      },
      global: {
        ...globalConfig,
        provide: { viewerProfile: ref(null) },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders without crashing when viewerProfile is not provided', () => {
    const wrapper = mount(ViewAsDropdown, {
      props: {
        modelValue: {
          isEditable: false,
          currentScope: 'social',
          previewLanguage: 'en',
          scopes: ['social'],
        },
        isDatingActive: false,
      },
      global: globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('exposes language options when viewer has languages', () => {
    const wrapper = mount(ViewAsDropdown, {
      props: {
        modelValue: {
          isEditable: false,
          currentScope: 'social',
          previewLanguage: 'en',
          scopes: ['social'],
        },
        isDatingActive: false,
      },
      global: {
        ...globalConfig,
        provide: { viewerProfile: ref({ languages: ['en', 'hu'] }) },
      },
    })
    expect(wrapper.text()).toContain('en')
    expect(wrapper.text()).toContain('hu')
  })
})
