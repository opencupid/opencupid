import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import OnboardingLayout from '../OnboardingLayout.vue'

describe('OnboardingLayout', () => {
  const mountLayout = () =>
    mount(OnboardingLayout, {
      global: {
        stubs: {
          RouterView: { template: '<div data-testid="router-view" />' },
        },
      },
    })

  it('renders a RouterView for the onboarding view', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('does not render AppShell chrome (sidebar, drawer, detail panel)', () => {
    // Regression guard: this layout MUST stay minimal. If someone adds a
    // drawer/panel/sidebar here they're recreating the cache-survival bug
    // this file was introduced to fix.
    const wrapper = mountLayout()
    expect(wrapper.find('#app-sidebar').exists()).toBe(false)
    expect(wrapper.find('[data-testid="orchestrator"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-panel-orchestrator"]').exists()).toBe(false)
  })
})
