<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

defineProps<{
  speedDial?: boolean
}>()

const isOpen = ref(false)
const root = useTemplateRef<HTMLDivElement>('root')

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
    class="floating-button"
    :aria-expanded="speedDial ? isOpen : undefined"
  >
    <Transition name="speed-dial">
      <div
        v-if="speedDial && isOpen"
        class="floating-button__actions"
        role="menu"
        @click="close"
      >
        <slot name="actions" />
      </div>
    </Transition>
    <div
      class="floating-button__trigger"
      @click="speedDial && toggle()"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.floating-button {
  position: absolute;
  z-index: 1000;
  right: 0.5rem;
  bottom: 0.5rem;

  @media (min-width: 576px) {
    bottom: 1rem;
    right: 1rem;
  }
}

.floating-button__actions {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.speed-dial-enter-active,
.speed-dial-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.speed-dial-enter-from,
.speed-dial-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
