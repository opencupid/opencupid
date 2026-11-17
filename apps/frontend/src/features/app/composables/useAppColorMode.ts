import { useColorMode } from 'bootstrap-vue-next'

/**
 * The app's light/dark colour mode, applied as `data-bs-theme` on <html>.
 *
 * Follows the browser's `prefers-color-scheme` until the user picks a mode,
 * after which the choice is kept in localStorage. The storage key is shared
 * with public/color-mode.js, which applies the same mode before first paint.
 */
export function useAppColorMode() {
  return useColorMode({ storageKey: 'color-mode' })
}
