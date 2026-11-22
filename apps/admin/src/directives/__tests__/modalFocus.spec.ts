import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { vModalFocus } from '../modalFocus'

const Host = defineComponent({
  directives: { ModalFocus: vModalFocus },
  setup() {
    return { open: ref(false), escaped: ref(0) }
  },
  template: `
    <div>
      <button data-testid="opener" @click="open = true">open</button>
      <div v-if="open" v-modal-focus class="modal" tabindex="-1" @keydown.escape="escaped++; open = false"></div>
    </div>
  `,
})

describe('vModalFocus', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => wrapper?.unmount())

  it('focuses the modal on mount so Escape reaches its handler', async () => {
    wrapper = mount(Host, { attachTo: document.body })
    ;(wrapper.vm as unknown as { open: boolean }).open = true
    await nextTick()

    const modal = wrapper.find('.modal')
    expect(document.activeElement).toBe(modal.element)

    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await nextTick()
    expect((wrapper.vm as unknown as { escaped: number }).escaped).toBe(1)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('restores focus to the previously focused element on unmount', async () => {
    wrapper = mount(Host, { attachTo: document.body })
    const opener = wrapper.find('[data-testid="opener"]').element as HTMLElement
    opener.focus()
    await wrapper.find('[data-testid="opener"]').trigger('click')
    expect(document.activeElement).toBe(wrapper.find('.modal').element)

    await wrapper.find('.modal').trigger('keydown', { key: 'Escape' })
    expect(document.activeElement).toBe(opener)
  })
})
