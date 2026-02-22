<script setup lang="ts">
const version = __APP_VERSION__?.app || 'unknown'
</script>

<template>
  <div
    class="text-center w-100"
    style="font-size: 0.5rem"
  >
    <code class="text-muted">
      <span>v{{ version }}</span>
    </code>
  </div>
</template>

<style scoped></style>
