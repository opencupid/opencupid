<template>
  <div class="floating-button">
    <slot />
  </div>
</template>

<style scoped>
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
