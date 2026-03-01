<script setup lang="ts">
import { useAppStore } from '@/features/app/stores/appStore'
import { storeToRefs } from 'pinia'

const frontendVersion = __APP_VERSION__
const { backendVersion } = storeToRefs(useAppStore())
</script>

<template>
  <div
    class="text-center w-100"
    style="font-size: 0.5rem"
  >
    <code class="text-muted">
      <span>frontend v{{ frontendVersion }}</span>
      <span
        v-if="backendVersion"
        class="ms-2"
      >
        backend v{{ backendVersion }}
      </span>
    </code>
  </div>
</template>

<style scoped></style>
