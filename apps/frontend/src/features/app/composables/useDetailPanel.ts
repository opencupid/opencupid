import { ref, shallowRef, markRaw, type Component } from 'vue'

/**
 * Imperative API for the global left-side detail panel.
 *
 * Architecture: a single persistent <BOffcanvas> lives in AppShellLayout via
 * DetailPanelOrchestrator. Consumers do not own panel state; they call
 * `show(component, props)` to push content in, and the orchestrator handles
 * open/close/animation lifecycle. Content stays mounted during the close
 * animation and is only unmounted after BOffcanvas emits `hidden`, which
 * eliminates the empty-panel flash that plagues v-if-driven approaches.
 *
 * Singleton — module-level refs are intentional, mirroring useAppShellState.
 */

// Extract prop type from a component definition. Handles both class-style
// (defineComponent / Options API) and setup-style components.
type ComponentProps<T> = T extends new (...args: never[]) => { $props: infer P }
  ? NonNullable<P>
  : T extends (props: infer P, ...args: never[]) => unknown
    ? NonNullable<P>
    : Record<string, unknown>

const isOpen = ref(false)
const currentComponent = shallowRef<Component | null>(null)
const currentProps = shallowRef<Record<string, unknown>>({})

export function useDetailPanel() {
  return {
    isOpen,
    currentComponent,
    currentProps,

    /**
     * Push content into the panel and begin the open animation.
     * Calling show() while the panel is already open swaps content in place
     * (no animation), which is the desired behavior for navigating between
     * profile/post detail views.
     */
    show<T extends Component>(component: T, props: ComponentProps<T> = {} as ComponentProps<T>) {
      currentComponent.value = markRaw(component)
      currentProps.value = props as Record<string, unknown>
      isOpen.value = true
    },

    /**
     * Begin the close animation. Content is NOT unmounted yet — that happens
     * inside notifyHidden() once BOffcanvas reports the slide-out is complete.
     */
    close() {
      isOpen.value = false
    },

    /**
     * Called by DetailPanelOrchestrator when BOffcanvas emits `hidden`,
     * indicating the close animation is fully done. Safe to unmount content.
     */
    notifyHidden() {
      currentComponent.value = null
      currentProps.value = {}
    },
  }
}
