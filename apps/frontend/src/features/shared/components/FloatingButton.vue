<script setup lang="ts">
/**
 * A container that floats in the bottom-right corner of its positioned
 * ancestor. Owns only positioning; consumers provide the visible content
 * via the default slot. For a speed-dial menu, wrap a SpeedDial inside.
 */
</script>

<template>
  <div class="floating-button">
    <slot />
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
</style>
