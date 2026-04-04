<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import { useNativeOffcanvas } from '@/features/shared/composables/useNativeOffcanvas'

defineOptions({ name: 'OwnerDrawer' })

const offcanvasState = useOffcanvasState()
const offcanvasEl = ref<HTMLElement>()
const bsIsOpen = ref(false)

watch(
  () => offcanvasState.isOpen('user'),
  (val) => {
    bsIsOpen.value = val
  }
)
watch(bsIsOpen, (open) => {
  if (!open) offcanvasState.close()
})
useNativeOffcanvas(offcanvasEl, bsIsOpen)
</script>

<template>
  <div
    ref="offcanvasEl"
    class="offcanvas offcanvas-end owner-drawer"
    tabindex="-1"
    aria-labelledby="ownerDrawerLabel"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owner-drawer {
  width: 320px;

  @media (max-width: 575.98px) {
    width: 100vw;
  }
}
</style>
