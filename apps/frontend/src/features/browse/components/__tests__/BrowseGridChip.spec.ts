import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}))
vi.mock('@/assets/icons/interface/grid.svg', () => ({ default: { template: '<svg />' } }))

import BrowseGridChip from '../BrowseGridChip.vue'

describe('BrowseGridChip', () => {
  it('shows how many items are nearby', () => {
    const wrapper = mount(BrowseGridChip, { props: { count: 42 } })
    expect(wrapper.text()).toContain('profiles.browse.grid.open_button:{"count":42}')
  })

  it('shows "list view" when nothing is in view', () => {
    const wrapper = mount(BrowseGridChip, { props: { count: 0 } })
    expect(wrapper.text()).toContain('profiles.browse.grid.open_button_empty')
  })

  it('shows an ellipsis while loading, with a readable label', () => {
    const wrapper = mount(BrowseGridChip, { props: { count: 3, loading: true } })
    expect(wrapper.text()).toContain('…')
    expect(wrapper.attributes('aria-label')).toBe('profiles.browse.grid.loading')
  })

  it('emits open on click', async () => {
    const wrapper = mount(BrowseGridChip, { props: { count: 1 } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})
