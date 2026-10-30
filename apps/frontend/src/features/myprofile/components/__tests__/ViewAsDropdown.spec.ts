import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ViewAsDropdown from '../ViewAsDropdown.vue'

vi.mock('@/features/shared/composables/useLanguages', () => ({
  useLanguages: () => ({
    getLanguageLabels: (codes: string[]) => codes.map((c) => ({ value: c, label: c })),
  }),
}))

vi.mock('@/assets/icons/interface/unhide.svg', () => ({ default: { template: '<i />' } }))
vi.mock('@/assets/icons/interface/globe.svg', () => ({ default: { template: '<i />' } }))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({ default: { template: '<i />' } }))

const mountWith = (viewerProfile: unknown) =>
  mount(ViewAsDropdown, {
    props: { modelValue: { currentScope: 'social', previewLanguage: 'en' } as never },
    global: {
      provide: { viewerProfile },
      mocks: { $t: (k: string) => k },
      stubs: { BDropdown: { template: '<div class="dropdown"><slot /></div>' } },
    },
  })

describe('ViewAsDropdown', () => {
  it('renders nothing while the owner profile is not loaded', () => {
    const wrapper = mountWith(ref(null))
    expect(wrapper.find('.dropdown').exists()).toBe(false)
  })

  it('renders when the profile has multiple languages', () => {
    const wrapper = mountWith(ref({ languages: ['en', 'hu'] }))
    expect(wrapper.find('.dropdown').exists()).toBe(true)
  })
})
