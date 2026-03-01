<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/features/app/stores/appStore'

const frontendVersion = __APP_VERSION__
const backendVersion = ref('')
const appStore = useAppStore()

onMounted(async () => {
  const result = await appStore.checkVersion()
  if (result.success && result.data) {
    backendVersion.value = result.data.backendVersion
  }
})
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
