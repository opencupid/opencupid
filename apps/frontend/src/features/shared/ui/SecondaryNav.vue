<script setup lang="ts"></script>

<template>
  <nav class="w-100 d-flex align-items-center">
    <div class="col-2">
      <slot name="items-left"></slot>
    </div>
    <div class="col-8 d-flex nav-item justify-content-center align-items-center">
      <slot name="items-center"></slot>
    </div>
    <div class="col-2 d-flex justify-content-end">
      <slot name="items-right"></slot>
    </div>
  </nav>
</template>

<style scoped>
:deep(button) {
  margin-top: 0 !important;
}
</style>
