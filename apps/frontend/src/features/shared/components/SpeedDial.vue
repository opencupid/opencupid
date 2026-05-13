<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useFloating, autoPlacement, autoUpdate, offset, shift } from '@floating-ui/vue'

/**
 * Speed-dial menu: a trigger button and a list of action pills that
 * appear above (or below, depending on viewport room) when opened.
 *
 * Placement is decided at open time by Floating UI's autoPlacement:
 * `top-end` is preferred (matches the legacy upward-opening behavior),
 * but `bottom-end` is used automatically when there's no room above.
 * `shift` keeps the menu inside the viewport on narrow screens.
 */

const isOpen = ref(false)

const root = useTemplateRef<HTMLDivElement>('root')
const triggerRef = useTemplateRef<HTMLDivElement>('trigger')
const actionsRef = useTemplateRef<HTMLDivElement>('actions')

const { floatingStyles, placement } = useFloating(triggerRef, actionsRef, {
  open: isOpen,
  placement: 'top-end',
  middleware: [
    offset(12),
    autoPlacement({ allowedPlacements: ['top-end', 'bottom-end'] }),
    shift({ padding: 8 }),
  ],
  whileElementsMounted: autoUpdate,
})

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

onClickOutside(root, () => {
  if (isOpen.value) close()
})
</script>

<template>
  <div
    ref="root"
    class="speed-dial"
    :aria-expanded="isOpen"
  >
    <Transition name="speed-dial">
      <div
        v-if="isOpen"
        ref="actions"
        class="speed-dial__actions"
        :class="`speed-dial__actions--${placement.startsWith('top') ? 'up' : 'down'}`"
        :style="floatingStyles"
        role="menu"
        @click="close"
      >
        <slot />
      </div>
    </Transition>
    <div
      ref="trigger"
      class="speed-dial__trigger"
      @click="toggle"
    >
      <slot name="trigger" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.speed-dial {
  position: relative;
}

.speed-dial__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

// When the menu opens below the trigger, reverse the visual order so the
// closest pill to the trigger sits at the top (matches the spatial flow).
.speed-dial__actions--down {
  flex-direction: column-reverse;
}

.speed-dial-enter-active,
.speed-dial-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

// Slide direction follows placement: from below when opening up,
// from above when opening down.
.speed-dial__actions--up.speed-dial-enter-from,
.speed-dial__actions--up.speed-dial-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

.speed-dial__actions--down.speed-dial-enter-from,
.speed-dial__actions--down.speed-dial-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
