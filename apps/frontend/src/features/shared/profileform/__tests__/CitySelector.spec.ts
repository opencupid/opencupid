import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

const getCity = vi.fn().mockResolvedValue({ id: '1', name: 'Old', country: 'US' })
const search = vi.fn().mockResolvedValue([{ id: '2', name: 'New', country: 'US' }])
const create = vi.fn().mockResolvedValue({ id: '3', name: 'Added', country: 'US' })

vi.mock('@/store/cityStore', () => ({
  useCitiesStore: () => ({ getCity, search, create })
}))

import CitySelector from '../CitySelector.vue'

describe('CitySelector', () => {
  it('fetches current city on mount', async () => {
    const wrapper = mount(CitySelector, {
      props: { modelValue: { cityId: '1', cityName: '', country: 'US' } }
    })
    await wrapper.vm.$nextTick()
    expect(getCity).toHaveBeenCalledWith('1')
    expect((wrapper.vm as any).selectedCity.id).toBe('1')
  })

  it('searches and adds cities', async () => {
    const wrapper = mount(CitySelector, {
      props: { modelValue: { cityId: '', cityName: '', country: 'US' } }
    })
    await (wrapper.vm as any).asyncFind('New')
    expect(search).toHaveBeenCalledWith('US', 'New')

    await (wrapper.vm as any).addCity('added')
    await wrapper.vm.$nextTick()
    expect(create).toHaveBeenCalledWith({ name: 'Added', country: 'US' })
    expect((wrapper.vm as any).model.cityId).toBe('3')
  })

  it('resets when country changes', async () => {
    const wrapper = mount(CitySelector, {
      props: { modelValue: { cityId: '', cityName: '', country: 'US' }, cityInputAutoFocus: true }
    })
    ;(wrapper.vm as any).model.country = 'CA'
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).selectedCity.country).toBe('CA')
    expect((wrapper.vm as any).showHint).toBe(true)
    expect((wrapper.vm as any).selectOptions.length).toBe(0)
  })
})
