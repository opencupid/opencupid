<template>
  <div class="floating-button">
    <slot />
  </div>
</template>

<style scoped>
.floating-button {
  position: fixed;
  z-index: 1000;
  right: 0.75rem;
  bottom: 5rem;

  @media (min-width: 576px) {
    bottom: 1.5rem;
    right: 1.5rem;
  }
}
</style>
