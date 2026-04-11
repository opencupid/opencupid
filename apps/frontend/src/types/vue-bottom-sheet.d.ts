declare module '@webzlodimir/vue-bottom-sheet' {
  import type { DefineComponent } from 'vue'

  const VueBottomSheet: DefineComponent<
    {
      maxWidth?: number
      maxHeight?: number
      canSwipe?: boolean
      overlay?: boolean
      overlayColor?: string
      overlayClickClose?: boolean
      transitionDuration?: number
    },
    { open: () => void; close: () => Promise<void> }
  >
  export default VueBottomSheet
}
