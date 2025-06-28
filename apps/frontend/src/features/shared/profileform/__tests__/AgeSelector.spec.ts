import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('../../composables/useAgeFields', () => ({ useAgeFields: () => ({ birthYearMin: ref(1950), birthYearMax: ref(2000) }) }))
vi.mock('vue-3-slider-component', () => ({ default: { template: '<div />' } }))

import AgeSelector from '../AgeSelector.vue'

describe('AgeSelector', () => {
  it('initializes birthYear', () => {
    const wrapper = mount(AgeSelector)
    expect((wrapper.vm as any).birthYear).not.toBeNull()
  })
})
