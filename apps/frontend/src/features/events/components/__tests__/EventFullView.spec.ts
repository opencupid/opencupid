import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))

vi.mock('@/lib/responsive', () => ({
  isMdUp: { value: true },
}))

import EventFullView from '../EventFullView.vue'

const event = { id: 'event-1', kind: 'event' as const } as any

const globalConfig = {
  stubs: {
    EventCard: { props: ['event'], template: '<div class="event-card-stub">{{ event.id }}</div>' },
    BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  },
  mocks: { $t: (k: string) => k },
}

describe('EventFullView', () => {
  it('renders the event card with a close button on md+', () => {
    const wrapper = mount(EventFullView, { props: { event }, global: globalConfig })
    expect(wrapper.find('.event-card-stub').text()).toBe('event-1')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('omits the close button when hideClose is set', () => {
    const wrapper = mount(EventFullView, {
      props: { event, hideClose: true },
      global: globalConfig,
    })
    expect(wrapper.find('.event-card-stub').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
