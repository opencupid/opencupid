<script setup lang="ts">
import IconSquare from '@/assets/icons/interface/square.svg'
</script>

<template>
  <div class="icon-grid">
    <IconSquare class="svg-icon-sm" />
    <IconSquare class="svg-icon-sm" />
    <IconSquare class="svg-icon-sm" />
    <IconSquare class="svg-icon-sm" />
  </div>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 0.15rem;
}
</style>
