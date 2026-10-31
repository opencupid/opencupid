import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

const { mockSearch, mockClear, results } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockClear: vi.fn(),
  results: { value: [] as any[] },
}))

vi.mock('vue-i18n', async () => {
  const { ref } = await import('vue')
  return { useI18n: () => ({ t: (k: string) => k, locale: ref('hu') }) }
})
vi.mock('@/features/geocoding/composables/useGeocoder', async () => {
  const { ref } = await import('vue')
  const res = ref<any[]>([])
  results.value = res as any
  return {
    useGeocoder: () => ({
      results: res,
      search: (...args: unknown[]) => {
        mockSearch(...args)
      },
      clear: () => {
        mockClear()
        res.value = []
      },
    }),
  }
})
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: {
    name: 'LocationLabel',
    props: ['location', 'viewerLocation', 'showOnlyForeignCountry', 'showCountryIcon'],
    template: '<span class="location-label">{{ location.cityName }}</span>',
  },
}))

import BrowseGridLocationField from '../BrowseGridLocationField.vue'

const budapest = { name: 'Budapest', country: 'HU', lat: 47.5, lon: 19.04 }
const stubs = {
  BListGroup: { template: '<ul class="list"><slot /></ul>' },
  BListGroupItem: { template: '<li class="item" v-bind="$attrs"><slot /></li>' },
}
const viewerProfile = ref({
  location: { country: 'HU', cityName: 'Szentendre', lat: 47.6, lon: 19.07 },
})

function mountField(areaName: string | null = 'Szentendre') {
  return mount(BrowseGridLocationField, {
    props: { areaName },
    global: { stubs, provide: { viewerProfile } },
    attachTo: document.body,
  })
}

describe('BrowseGridLocationField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSearch.mockReset()
    mockClear.mockReset()
    ;(results.value as any).value = []
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows the current area name, or the placeholder when unknown', () => {
    expect((mountField().find('input').element as HTMLInputElement).value).toBe('Szentendre')
    const empty = mountField(null).find('input')
    expect((empty.element as HTMLInputElement).value).toBe('')
    expect(empty.attributes('placeholder')).toBe('profiles.browse.grid.location_placeholder')
  })

  it('clears on focus and searches places after a pause in typing', async () => {
    const wrapper = mountField()
    const input = wrapper.find('input')
    await input.trigger('focus')
    expect((input.element as HTMLInputElement).value).toBe('')

    await input.setValue('Bud')
    await input.setValue('Budap')
    expect(mockSearch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(350)

    expect(mockSearch).toHaveBeenCalledTimes(1)
    expect(mockSearch).toHaveBeenCalledWith('Budap', 'hu', viewerProfile.value.location)
  })

  it('emits the picked place and goes back to the area name', async () => {
    const wrapper = mountField()
    const input = wrapper.find('input')
    await input.trigger('focus')
    ;(results.value as any).value = [budapest]
    await wrapper.vm.$nextTick()

    await wrapper.find('.item').trigger('click')

    expect(wrapper.emitted('place:select')).toEqual([[budapest]])
    expect(mockClear).toHaveBeenCalled()
    expect((input.element as HTMLInputElement).value).toBe('Szentendre')
  })

  it('restores the area name on Escape', async () => {
    const wrapper = mountField()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('Bud')
    await input.trigger('keydown', { key: 'Escape' })

    expect((input.element as HTMLInputElement).value).toBe('Szentendre')
    expect(wrapper.emitted('place:select')).toBeUndefined()
  })

  it('hides suggestions when not editing', async () => {
    const wrapper = mountField()
    ;(results.value as any).value = [budapest]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.list').exists()).toBe(false)
  })
})
