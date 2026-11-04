import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { PublicEventDetail } from '@zod/event/event.dto'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ locale: ref('en') }) }))
vi.mock('@/features/userContent/components/UserContentMapPopup.vue', () => ({
  default: { props: ['item'], template: '<div><slot name="content" /></div>' },
}))

import EventMapPopup from '../EventMapPopup.vue'

const event = (content: string, images: unknown[] = []) =>
  ({ content, images, startsAt: new Date('2026-11-20T16:00:00Z') }) as PublicEventDetail

describe('EventMapPopup', () => {
  it('shows the start of the content, title and description', () => {
    const wrapper = mount(EventMapPopup, { props: { item: event('Name\n\nDescription') } })
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('Description')
  })

  it('shows only the first line with titleOnly', () => {
    const wrapper = mount(EventMapPopup, {
      props: { item: event('Name\n\nDescription'), titleOnly: true },
    })
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).not.toContain('Description')
  })

  it('puts the name in the translucent overlay over a picture in card mode', () => {
    const wrapper = mount(EventMapPopup, {
      props: { item: event('Name\n\nDescription', [{ id: 'img' }]), titleOnly: true },
    })
    expect(wrapper.find('.event-overlay .event-title').text()).toBe('Name')
  })

  it('keeps the coloured block without a picture', () => {
    const wrapper = mount(EventMapPopup, {
      props: { item: event('Name\n\nDescription'), titleOnly: true },
    })
    expect(wrapper.find('.event-overlay').exists()).toBe(false)
    expect(wrapper.find('.bg-event-light').exists()).toBe(true)
  })

  it('never uses the overlay in the map popup', () => {
    const wrapper = mount(EventMapPopup, {
      props: { item: event('Name\n\nDescription', [{ id: 'img' }]) },
    })
    expect(wrapper.find('.event-overlay').exists()).toBe(false)
  })
})
