<script setup lang="ts">
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'

defineProps<{
  isLoading: boolean
  isInitialized: boolean
  haveResults: boolean
}>()
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div class="list-view d-flex flex-column justify-content-start">
      <FluidColumn class="my-2">
        <div class="subnav-bar d-flex align-items-center gap-2 px-2 py-1 rounded">
          <slot name="filter-bar" />
        </div>
      </FluidColumn>

      <div class="overflow-auto hide-scrollbar flex-grow-1 position-relative">
        <slot name="results" />
      </div>
    </div>

    <slot name="floating" />
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';
@import '@/css/theme.scss';

.list-view {
  height: calc(100vh - $navbar-height);
}

main {
  width: 100%;
}

.subnav-bar {
  position: relative;
  z-index: 1030;
}
</style>
