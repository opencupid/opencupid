import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import DetailPanelOrchestrator from '../DetailPanelOrchestrator.vue'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'

const DummyContent = defineComponent({
  name: 'DummyContent',
  props: { label: { type: String, required: true } },
  setup: (p) => () => h('div', { 'data-testid': 'dummy' }, p.label),
})

// Stub BOffcanvas as a passthrough that re-emits modelValue updates and exposes
// a `triggerHidden` helper to simulate the post-animation `hidden` event.
const BOffcanvasStub = defineComponent({
  name: 'BOffcanvas',
  props: ['modelValue'],
  emits: ['update:modelValue', 'hidden'],
  setup(_, { slots }) {
    return () => h('div', { class: 'offcanvas-stub' }, slots.default?.())
  },
})

describe('DetailPanelOrchestrator', () => {
  beforeEach(() => {
    const panel = useDetailPanel()
    panel.notifyHidden()
    panel.close()
  })

  const mountIt = () =>
    mount(DetailPanelOrchestrator, {
      global: {
        stubs: { BOffcanvas: BOffcanvasStub },
        mocks: { $t: (k: string) => k },
      },
    })

  it('renders nothing inside the panel when no content is registered', () => {
    const wrapper = mountIt()
    expect(wrapper.find('[data-testid="dummy"]').exists()).toBe(false)
  })

  it('renders the registered component with its props after show()', async () => {
    const wrapper = mountIt()
    const panel = useDetailPanel()
    panel.show(DummyContent, { label: 'hello' })
    await nextTick()
    const dummy = wrapper.find('[data-testid="dummy"]')
    expect(dummy.exists()).toBe(true)
    expect(dummy.text()).toBe('hello')
  })

  it('keeps content mounted when close() is called (waits for hidden)', async () => {
    const wrapper = mountIt()
    const panel = useDetailPanel()
    panel.show(DummyContent, { label: 'hello' })
    await nextTick()
    panel.close()
    await nextTick()
    expect(wrapper.find('[data-testid="dummy"]').exists()).toBe(true)
  })

  it('unmounts content after BOffcanvas emits @hidden', async () => {
    const wrapper = mountIt()
    const panel = useDetailPanel()
    panel.show(DummyContent, { label: 'hello' })
    await nextTick()
    panel.close()
    wrapper.findComponent(BOffcanvasStub).vm.$emit('hidden')
    await nextTick()
    expect(wrapper.find('[data-testid="dummy"]').exists()).toBe(false)
  })
})
