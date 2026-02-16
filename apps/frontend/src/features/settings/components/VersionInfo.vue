<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/features/app/stores/appStore'
import type { VersionDTO } from '@zod/dto/version.dto'

const appStore = useAppStore()

const version = ref<VersionDTO | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  isLoading.value = true
  error.value = null

  const result = await appStore.fetchVersion()

  if (result.success) {
    version.value = result.data!
  } else {
    error.value = result.message
  }

  isLoading.value = false
})
</script>

<template>
  <div class="text-center w-100" style="font-size: 0.5rem">
    <div v-if="isLoading" class="text-muted">Loading version information...</div>

    <div v-else-if="error" class="text-danger">
      {{ error }}
    </div>

    <code v-else-if="version" class="text-muted">v{{ version.version }}</code>
  </div>
</template>

<style scoped></style>
