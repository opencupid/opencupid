import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { useDetailPanel } from '../useDetailPanel'

const DummyContent = defineComponent({
  name: 'DummyContent',
  props: { profileId: { type: String, required: true } },
  setup: (p) => () => h('div', `dummy ${p.profileId}`),
})

describe('useDetailPanel', () => {
  beforeEach(() => {
    // Reset the singleton state between tests
    const panel = useDetailPanel()
    panel.notifyHidden()
    panel.close()
  })

  it('show() sets the component, props, and isOpen=true', () => {
    const panel = useDetailPanel()
    panel.show(DummyContent, { profileId: 'abc' })
    expect(panel.isOpen.value).toBe(true)
    expect(panel.currentComponent.value).toBe(DummyContent)
    expect(panel.currentProps.value).toEqual({ profileId: 'abc' })
  })

  it('close() flips isOpen but keeps content mounted (waiting for hidden event)', () => {
    const panel = useDetailPanel()
    panel.show(DummyContent, { profileId: 'abc' })
    panel.close()
    expect(panel.isOpen.value).toBe(false)
    // Content stays mounted so it remains visible during slide-out animation
    expect(panel.currentComponent.value).toBe(DummyContent)
  })

  it('notifyHidden() unmounts content after the close animation', () => {
    const panel = useDetailPanel()
    panel.show(DummyContent, { profileId: 'abc' })
    panel.close()
    panel.notifyHidden()
    expect(panel.currentComponent.value).toBe(null)
    expect(panel.currentProps.value).toEqual({})
  })

  it('show() while already open swaps content in place without re-animating', () => {
    const panel = useDetailPanel()
    panel.show(DummyContent, { profileId: 'a' })
    expect(panel.isOpen.value).toBe(true)
    panel.show(DummyContent, { profileId: 'b' })
    expect(panel.isOpen.value).toBe(true)
    expect(panel.currentProps.value).toEqual({ profileId: 'b' })
  })

  it('shares state across calls (singleton)', () => {
    const a = useDetailPanel()
    const b = useDetailPanel()
    a.show(DummyContent, { profileId: 'x' })
    expect(b.isOpen.value).toBe(true)
    expect(b.currentProps.value).toEqual({ profileId: 'x' })
  })
})
