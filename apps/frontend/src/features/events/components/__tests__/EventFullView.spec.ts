import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

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

import EventFullView from '../EventFullView.vue'

const stubs = {
  EventCard: {
    props: ['event'],
    template: '<div class="event-card-stub">{{ event.id }}</div>',
  },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const event = {
  id: 'e-1',
  kind: 'event' as const,
  content: 'Test',
  startsAt: new Date('2030-01-01T10:00:00Z'),
  venue: null,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  images: [],
  tags: [],
} as any

const globalConfig = { stubs, mocks: { $t: (k: string) => k } }

describe('EventFullView', () => {
  it('renders the event card', () => {
    const wrapper = mount(EventFullView, { props: { event }, global: globalConfig })
    expect(wrapper.find('.event-card-stub').text()).toBe('e-1')
  })

  it('navigates back to Browse when no detailPanelClose provider', async () => {
    replaceMock.mockClear()
    const wrapper = mount(EventFullView, { props: { event }, global: globalConfig })
    await wrapper.find('button').trigger('click')
    expect(replaceMock).toHaveBeenCalledWith({ name: 'Browse' })
  })

  it('calls detailPanelClose when provided', async () => {
    const close = vi.fn()
    const wrapper = mount(EventFullView, {
      props: { event },
      global: { ...globalConfig, provide: { detailPanelClose: close } },
    })
    await wrapper.find('button').trigger('click')
    expect(close).toHaveBeenCalled()
  })

  // The md+ detail panel body is `overflow-hidden`, so the content component
  // must own its scroll container or tall events are clipped rather than
  // scrolled. Mirrors CommunityFullView.
  it('owns a full-height scroll container for the md+ panel', () => {
    const wrapper = mount(EventFullView, { props: { event }, global: globalConfig })
    const root = wrapper.element as HTMLElement
    expect(root.className).toContain('h-100')
    expect(root.className).toContain('d-flex')
    expect(root.className).toContain('flex-column')

    const scroller = wrapper.find('.event-scroll')
    expect(scroller.exists()).toBe(true)
    expect(scroller.classes()).toEqual(expect.arrayContaining(['flex-grow-1', 'overflow-auto']))
    expect(scroller.find('.event-card-stub').exists()).toBe(true)
  })
})
