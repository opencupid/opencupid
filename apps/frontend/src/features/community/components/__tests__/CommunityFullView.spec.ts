import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const replaceMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))

vi.mock('@/lib/responsive', () => ({
  isMdUp: { value: true },
}))

import CommunityFullView from '../CommunityFullView.vue'

const stubs = {
  CommunityCard: {
    props: ['community'],
    // Renders the `details` slot so contact-block assertions still see it.
    template: '<div class="community-card-stub">{{ community.id }}</div>',
  },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const community = {
  id: 'c-1',
  kind: 'community' as const,
  content: 'Test',
  yearFounded: null,
  contactUrl: null,
  contactEmail: null,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  tags: [],
} as any

const globalConfig = { stubs, mocks: { $t: (k: string) => k } }

describe('CommunityFullView', () => {
  it('renders the community card', () => {
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: globalConfig,
    })
    expect(wrapper.find('.community-card-stub').text()).toBe('c-1')
  })

  it('navigates back to Browse when no detailPanelClose provider', async () => {
    replaceMock.mockClear()
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(replaceMock).toHaveBeenCalledWith({ name: 'Browse' })
  })

  // The md+ detail panel body is `overflow-hidden`, so the content component
  // must own its scroll container or long descriptions are clipped rather than
  // scrolled. Mirrors the height chain PublicProfile establishes.
  it('owns a full-height scroll container for the md+ panel', () => {
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: globalConfig,
    })
    const root = wrapper.element as HTMLElement
    expect(root.className).toContain('h-100')
    expect(root.className).toContain('d-flex')
    expect(root.className).toContain('flex-column')

    // `min-height: 0` comes from the component's scoped style, not a utility
    // class (Bootstrap ships no min-height utilities).
    const scroller = wrapper.find('.community-scroll')
    expect(scroller.exists()).toBe(true)
    expect(scroller.classes()).toEqual(expect.arrayContaining(['flex-grow-1', 'overflow-auto']))
    // The card must live inside the scroller, not as a sibling above it.
    expect(scroller.find('.community-card-stub').exists()).toBe(true)
  })
})
