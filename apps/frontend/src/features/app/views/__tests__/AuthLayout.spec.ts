import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/app/components/OwnerDrawerOrchestrator.vue', () => ({
  default: { name: 'OwnerDrawerOrchestrator', template: '<div data-testid="orchestrator" />' },
}))

vi.mock('@/features/app/components/DetailPanelOrchestrator.vue', () => ({
  default: {
    name: 'DetailPanelOrchestrator',
    template: '<div data-testid="detail-panel-orchestrator" />',
  },
}))

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({ profile: null }),
}))

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  return { ...actual, storeToRefs: () => ({ profile: ref(null) }) }
})

import AuthLayout from '../AuthLayout.vue'

describe('AuthLayout', () => {
  const mountLayout = () =>
    mount(AuthLayout, {
      global: {
        stubs: {
          RouterView: { template: '<div data-testid="router-view" />' },
          KeepAlive: { template: '<slot />' },
        },
      },
    })

  it('renders a RouterView for route content', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('renders OwnerDrawerOrchestrator', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="orchestrator"]').exists()).toBe(true)
  })

  it('renders DetailPanelOrchestrator', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="detail-panel-orchestrator"]').exists()).toBe(true)
  })
})
