<script setup lang="ts">

import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import IconClose from '@/assets/icons/interface/cross.svg'


</script>

<template>
  <nav class="w-100 d-flex align-items-center my-2 my-lg-3 my-xl-4">
    <div class="col-2">
      <slot name="items-left"></slot>
    </div>
    <div class="col-8 d-flex nav-item justify-content-center align-items-center">
      <slot name="items-center"></slot>
    </div>
    <div class="col-2 d-flex justify-content-end">
      <slot name="items-right">
          <RouterBackButton>
             <IconClose class="svg-icon" /> </RouterBackButton>

      </slot>
    </div>
  </nav>
</template>

<style scoped>
:deep(button) {
  margin-top: 0 !important;
}
</style>
