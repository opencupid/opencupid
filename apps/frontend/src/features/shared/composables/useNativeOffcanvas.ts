import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import Offcanvas from 'bootstrap/js/dist/offcanvas'

/**
 * Thin wrapper around Bootstrap's native Offcanvas JS.
 * Bypasses bootstrap-vue-next's BOffcanvas which has a close-animation flash bug.
 *
 * @param elRef   template ref for the `.offcanvas` element
 * @param isOpen  two-way binding: set to `true` to open, `false` to close.
 *                Written back only after the animation completes (on shown/hidden events).
 */
export function useNativeOffcanvas(elRef: Ref<HTMLElement | undefined>, isOpen: Ref<boolean>) {
  let instance: Offcanvas | null = null

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    instance = new Offcanvas(el)

    el.addEventListener('shown.bs.offcanvas', () => {
      isOpen.value = true
    })
    el.addEventListener('hidden.bs.offcanvas', () => {
      isOpen.value = false
    })
  })

  onBeforeUnmount(() => {
    instance?.dispose()
    instance = null
  })

  watch(isOpen, (open) => {
    if (open) instance?.show()
    else instance?.hide()
  })
}
