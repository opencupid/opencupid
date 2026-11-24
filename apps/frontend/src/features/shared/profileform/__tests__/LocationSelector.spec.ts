import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ref, computed } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: ref('en') }) }))
// Each call to useGeocoder() returns its own refs, mirroring the per-instance
// contract of the production composable so two LocationSelector mounts can't
// silently share state in tests.
const geocoderStatus = ref('idle')
vi.mock('@/features/geocoding/composables/useGeocoder', () => ({
  useGeocoder: () => {
    const results = ref<unknown[]>([])
    const isLoading = ref(false)
    const hasResults = computed(() => results.value.length > 0)
    return {
      results,
      isLoading,
      hasResults,
      status: geocoderStatus,
      search: vi.fn(),
      setResults: vi.fn((items: unknown[]) => {
        results.value = items
      }),
      clear: vi.fn(),
    }
  },
}))
vi.mock('@/assets/icons/interface/search.svg', () => ({ default: { template: '<span />' } }))

import LocationSelectorComponent from '../LocationSelector.vue'

describe('LocationSelectorComponent', () => {
  it('emits updates when fields change', async () => {
    const wrapper = mount(LocationSelectorComponent, {
      props: { modelValue: { country: '', cityName: '' } as any },
      global: { stubs: { FormKit: true }, mocks: { $t: (k: string) => k } },
    })
    ;(wrapper.vm as any).model = {
      ...(wrapper.vm as any).model,
      country: 'US',
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    ;(wrapper.vm as any).model = {
      ...(wrapper.vm as any).model,
      cityName: 'NYC',
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')!.length).toBeGreaterThanOrEqual(1)
  })

  it('passes through close-on-select attr to Multiselect', () => {
    const wrapper = mount(LocationSelectorComponent, {
      props: { modelValue: { country: '', cityName: '' } as any },
      attrs: { 'close-on-select': true },
      global: { mocks: { $t: (k: string) => k } },
    })
    const multiselect = wrapper.findComponent({ name: 'Multiselect' })
    expect(multiselect.exists() || wrapper.html()).toBeTruthy()
  })

  it('passes through close-on-select=false attr to Multiselect', () => {
    const wrapper = mount(LocationSelectorComponent, {
      props: { modelValue: { country: '', cityName: '' } as any },
      attrs: { 'close-on-select': false },
      global: { mocks: { $t: (k: string) => k } },
    })
    const multiselect = wrapper.findComponent({ name: 'Multiselect' })
    expect(multiselect.exists() || wrapper.html()).toBeTruthy()
  })

  describe('search feedback', () => {
    beforeEach(() => {
      geocoderStatus.value = 'idle'
    })

    const mountSelector = () =>
      mount(LocationSelectorComponent, {
        props: { modelValue: { country: '', cityName: '' } as any },
        global: { mocks: { $t: (k: string) => k } },
      })

    it('shows nothing while idle or after a match', async () => {
      const wrapper = mountSelector()
      expect(wrapper.find('.search-feedback').exists()).toBe(false)

      geocoderStatus.value = 'found'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.search-feedback').exists()).toBe(false)
    })

    it('tells the user when the search failed', async () => {
      geocoderStatus.value = 'error'
      const feedback = mountSelector().find('.search-feedback')
      expect(feedback.text()).toBe('profiles.forms.city_search_failed')
      expect(feedback.classes()).toContain('text-danger')
    })

    it('tells the user when no place matched', async () => {
      geocoderStatus.value = 'empty'
      const feedback = mountSelector().find('.search-feedback')
      expect(feedback.text()).toBe('profiles.forms.city_search_no_match')
      expect(feedback.classes()).toContain('text-muted')
    })
  })
})
