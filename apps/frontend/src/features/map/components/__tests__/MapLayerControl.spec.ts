import { vi, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: { value: 'en' },
  }),
}))

// vitest doesn't run vite-svg-loader, so *.svg imports resolve to URL
// strings instead of Vue components. Provide no-op Vue components so the
// imports inside MapLayerControl render cleanly under jsdom. vi.mock is
// hoisted, so each factory is fully self-contained.
vi.mock('@/assets/icons/interface/layer.svg', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ render: () => h('svg') }) }
})
vi.mock('@/assets/icons/interface/user.svg', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ render: () => h('svg') }) }
})
vi.mock('@/assets/icons/interface/post-it.svg', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ render: () => h('svg') }) }
})
vi.mock('@/assets/icons/interface/calendar.svg', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ render: () => h('svg') }) }
})

import MapLayerControl from '../MapLayerControl.vue'
import type { UserContentKind } from '@shared/maps'

function mountWith(modelValue: UserContentKind[]) {
  return mount(MapLayerControl, { props: { modelValue } })
}

function toggles(wrapper: ReturnType<typeof mountWith>) {
  // BFormCheckbox renders an <input type="checkbox"> per toggle.
  // setValue() simulates a real user toggle: it flips the input's
  // checked state and dispatches `change`, which is what BFormCheckbox
  // listens to in order to emit update:modelValue.
  const inputs = wrapper.findAll('input[type="checkbox"]')
  if (inputs.length !== 3) throw new Error(`expected 3 toggles, got ${inputs.length}`)
  return { people: inputs[0]!, posts: inputs[1]!, events: inputs[2]! }
}

describe('MapLayerControl', () => {
  it('renders all layer toggles with translation keys', () => {
    const wrapper = mountWith(['profile', 'post', 'event'])
    const text = wrapper.text()
    expect(text).toContain('map.layer_control.people')
    expect(text).toContain('map.layer_control.posts')
    expect(text).toContain('map.layer_control.events')
  })

  it('emits update:modelValue without "profile" when the people toggle is unchecked while selected', async () => {
    const wrapper = mountWith(['profile', 'post', 'event'])
    await toggles(wrapper).people.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['post', 'event']]])
  })

  it('emits update:modelValue without "post" when the posts toggle is unchecked while selected', async () => {
    const wrapper = mountWith(['profile', 'post', 'event'])
    await toggles(wrapper).posts.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['profile', 'event']]])
  })

  it('emits update:modelValue without "event" when the events toggle is unchecked while selected', async () => {
    const wrapper = mountWith(['profile', 'post', 'event'])
    await toggles(wrapper).events.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['profile', 'post']]])
  })

  it('emits update:modelValue adding "profile" when the people toggle is checked while unselected', async () => {
    const wrapper = mountWith(['post'])
    await toggles(wrapper).people.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['post', 'profile']]])
  })

  it('emits update:modelValue adding "event" when the events toggle is checked while unselected', async () => {
    const wrapper = mountWith(['post'])
    await toggles(wrapper).events.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['post', 'event']]])
  })

  it('disables the only-selected toggle so it cannot be unchecked', () => {
    const wrapper = mountWith(['profile'])
    const { people, posts, events } = toggles(wrapper)
    expect(people.attributes('disabled')).toBeDefined()
    expect(posts.attributes('disabled')).toBeUndefined()
    expect(events.attributes('disabled')).toBeUndefined()
  })
})
