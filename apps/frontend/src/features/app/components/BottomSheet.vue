<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSwipe } from '@vueuse/core'

const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ hidden: [] }>()

defineOptions({ name: 'BottomSheet' })

const handleRef = ref<HTMLElement | null>(null)
// Internal visibility state — drives BOffcanvas directly.
// Decoupled from model so we can animate before hiding.
const visible = ref(false)

const DISMISS_THRESHOLD = 0.3

function getOffcanvasEl(): HTMLElement | null {
  return handleRef.value?.closest('.offcanvas') ?? null
}

let isDragging = false
let dismissAnim: Animation | null = null

watch(
  model,
  (val) => {
    if (val) {
      visible.value = true
    } else if (visible.value) {
      animateOut()
    }
  },
  { immediate: true }
)

function animateOut() {
  const el = getOffcanvasEl()
  if (!el) {
    visible.value = false
    return
  }

  const anim = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
    duration: 200,
    easing: 'ease-out',
    fill: 'forwards',
  })
  anim.onfinish = () => {
    dismissAnim = anim
    visible.value = false
  }
}

const { lengthY } = useSwipe(handleRef, {
  threshold: 10,
  onSwipe() {
    const dy = -lengthY.value
    if (dy <= 0) return
    isDragging = true
    const el = getOffcanvasEl()
    if (el) el.style.transform = `translateY(${dy}px)`
  },
  onSwipeEnd() {
    const el = getOffcanvasEl()
    const delta = -lengthY.value
    const sheetHeight = el?.offsetHeight ?? 0

    if (!el || !isDragging) {
      isDragging = false
      return
    }

    el.style.transform = ''

    if (delta >= sheetHeight * DISMISS_THRESHOLD) {
      const anim = el.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(100%)' }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      )
      anim.onfinish = () => {
        dismissAnim = anim
        visible.value = false
        model.value = false
      }
    } else {
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
        duration: 250,
        easing: 'ease',
      })
    }

    isDragging = false
  },
})

function onShow() {
  const el = getOffcanvasEl()
  if (el) {
    el.style.transform = 'translateY(100%)'
    requestAnimationFrame(() => {
      el.style.transform = ''
      el.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
        duration: 250,
        easing: 'ease',
      })
    })
  }
}

function onHidden() {
  if (dismissAnim) {
    dismissAnim.cancel()
    dismissAnim = null
  }
  model.value = false
  emit('hidden')
}
</script>

<template>
  <BOffcanvas
    v-model="visible"
    placement="bottom"
    no-animation
    class="bottom-sheet"
    body-class="p-0 d-flex flex-column overflow-hidden"
    header-class="p-0"
    @show="onShow"
    @hidden="onHidden"
    :focus="false"
  >
    <template #header>
      <div
        ref="handleRef"
        class="bottom-sheet-handle"
      >
        <div class="bottom-sheet-pill" />
      </div>
    </template>
    <div class="bottom-sheet-body">
      <slot />
    </div>
  </BOffcanvas>
</template>

<style lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.bottom-sheet {
  --bs-offcanvas-height: 75vh;
  border-radius: 12px 12px 0 0;
}

.bottom-sheet-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50px;
  width: 100%;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
}

.bottom-sheet-pill {
  width: 36px;
  height: 4px;
  background: $gray-400;
  border-radius: 2px;
}

.bottom-sheet-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
