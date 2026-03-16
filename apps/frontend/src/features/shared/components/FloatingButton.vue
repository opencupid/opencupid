<template>
  <div class="floating-button">
    <slot />
  </div>
</template>

<style scoped>
.floating-button {
  position: fixed;
  z-index: 1000;
  bottom: 1.5rem;
  right: 1.5rem;
}
</style>
