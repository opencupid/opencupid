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
  if (inputs.length !== 2) throw new Error(`expected 2 toggles, got ${inputs.length}`)
  return { people: inputs[0]!, posts: inputs[1]! }
}

describe('MapLayerControl', () => {
  it('renders both layer toggles with translation keys', () => {
    const wrapper = mountWith(['profile', 'post'])
    const text = wrapper.text()
    expect(text).toContain('map.layer_control.people')
    expect(text).toContain('map.layer_control.posts')
  })

  it('emits update:modelValue without "profile" when the people toggle is unchecked while selected', async () => {
    const wrapper = mountWith(['profile', 'post'])
    await toggles(wrapper).people.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['post']]])
  })

  it('emits update:modelValue without "post" when the posts toggle is unchecked while selected', async () => {
    const wrapper = mountWith(['profile', 'post'])
    await toggles(wrapper).posts.setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['profile']]])
  })

  it('emits update:modelValue adding "profile" when the people toggle is checked while unselected', async () => {
    const wrapper = mountWith(['post'])
    await toggles(wrapper).people.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[['post', 'profile']]])
  })

  it('disables the only-selected toggle so it cannot be unchecked', () => {
    const wrapper = mountWith(['profile'])
    const { people, posts } = toggles(wrapper)
    expect(people.attributes('disabled')).toBeDefined()
    expect(posts.attributes('disabled')).toBeUndefined()
  })
})
