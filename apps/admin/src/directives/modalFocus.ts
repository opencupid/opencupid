import type { Directive } from 'vue'

const previousFocus = new WeakMap<HTMLElement, Element | null>()

/**
 * Moves keyboard focus into a hand-rolled `.modal` when it mounts, so
 * `@keydown.escape` / `@keydown.enter` handlers on it fire without the user
 * having to click inside first. Restores focus to the previously focused
 * element on unmount, mirroring Bootstrap's own modal behaviour.
 */
export const vModalFocus: Directive<HTMLElement> = {
  mounted(el) {
    previousFocus.set(el, document.activeElement)
    el.focus({ preventScroll: true })
  },
  unmounted(el) {
    const prev = previousFocus.get(el)
    if (prev instanceof HTMLElement && prev.isConnected) prev.focus({ preventScroll: true })
  },
}
