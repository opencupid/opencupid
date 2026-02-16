import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))
vi.mock('@/assets/icons/app/cupid.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/app/socialize.svg', () => ({ default: { template: '<div />' } }))

import GoalsSelector from '../GoalsSelector.vue'

describe('GoalsSelector', () => {
  it('toggles flags when buttons clicked', async () => {
    const wrapper = mount(GoalsSelector)
    await wrapper.findAll('.btn-social-toggle')[0]!.trigger('click')
    await wrapper.findAll('.btn-dating-toggle')[0]!.trigger('click')
    expect((wrapper.vm as any).model.isSocialActive).toBe(true)
    expect((wrapper.vm as any).model.isDatingActive).toBe(true)
  })
})
