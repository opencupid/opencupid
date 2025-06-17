<template>
  <div class="login-success-component">
    <div class="d-flex justify-content-center align-items-center flex-column h-100">
      <div class="icon-inner text-success animate__animated animate__fadeIn">
        <DoodleIcons name="IconSun" class="svg-icon welcome-icon" />
      </div>
      <div class="text-success fs-3 animate__animated animate__fadeIn">Welcome!</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import 'animate.css'
import DoodleIcons from '@/components/icons/DoodleIcons.vue'
</script>

<style scoped>
.icon-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50vh;
  margin-bottom: 1em;
}

.welcome-icon {
  width: 10rem;
  height: 10rem;
}
</style>
