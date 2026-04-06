<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppShellState } from '@/features/app/composables/useAppShellState'
import { useNativeOffcanvas } from '@/features/shared/composables/useNativeOffcanvas'

defineOptions({ name: 'OwnerDrawer' })

const { drawerType } = useAppShellState()
const router = useRouter()
const route = useRoute()
const offcanvasEl = ref<HTMLElement>()
const bsIsOpen = ref(false)

// Route state → open/close offcanvas
watch(
  () => drawerType.value !== null,
  (shouldBeOpen) => {
    bsIsOpen.value = shouldBeOpen
  },
  { immediate: true }
)

// Bootstrap close gesture → navigate to Browse
watch(bsIsOpen, (open) => {
  if (!open && route.name !== 'Browse') {
    router.replace({ name: 'Browse' })
  }
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
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.owner-drawer {

  @include media-breakpoint-up(md) {
    width: 75vw;
  }

  @include media-breakpoint-up(lg) {
    width: 33vw;
  }

  @include media-breakpoint-down(sm) {
    width: 100vw;
  }
}
</style>
