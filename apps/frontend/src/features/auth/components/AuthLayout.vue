<script setup lang="ts">
defineOptions({ name: 'AuthLayout' })
</script>

<template>
  <main
    class="container-fluid d-flex flex-column justify-content-center align-items-center min-vh-100 map-bg"
  >
    <div
      class="d-flex flex-column align-items-center auth-dialog px-3 px-lg-5 py-4 rounded shadow-lg"
    >
      <slot />
    </div>
  </main>
</template>

<style scoped lang="scss">
@import '@bootstrap/scss/functions';
@import '@bootstrap/scss/variables';
@import '@bootstrap/scss/mixins';
@import '@bootstrap/scss/buttons';
@import '@/css/theme';

.map-bg {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('@/assets/images/app/map-bg.png');
    background-size: cover;
    background-position: center;
    opacity: 0.3;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.auth-dialog {
  background: rgba($sand-lightest, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba($sand-lightest, 0.4);
}
</style>
