<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/features/app/stores/appStore'
import type { VersionDTO } from '@zod/dto/version.dto'

const appStore = useAppStore()

const version = ref<VersionDTO | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}

const formatCommit = (commit: string) => {
  return commit.substring(0, 8)
}

onMounted(async () => {
  isLoading.value = true
  error.value = null
  
  const result = await appStore.fetchVersion()
  
  if (result.success) {
    version.value = result.data
  } else {
    error.value = result.message
  }
  
  isLoading.value = false
})
</script>

<template>
  <div class="version-info">
    <h5 class="mb-3">Version Information</h5>
    
    <div v-if="isLoading" class="text-muted">
      Loading version information...
    </div>
    
    <div v-else-if="error" class="text-danger">
      {{ error }}
    </div>
    
    <div v-else-if="version" class="version-details">
      <div class="mb-2">
        <strong>Version:</strong> <code>{{ version.version }}</code>
      </div>
      <div class="mb-2">
        <strong>Commit:</strong> <code>{{ formatCommit(version.commit) }}</code>
      </div>
      <div class="mb-2">
        <strong>Built:</strong> {{ formatTimestamp(version.timestamp) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.version-info {
  padding: 1rem;
  background-color: var(--bs-light);
  border-radius: 0.375rem;
  border: 1px solid var(--bs-border-color);
}

[data-bs-theme="dark"] .version-info {
  background-color: var(--bs-dark);
}

.version-details code {
  background-color: var(--bs-gray-100);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

[data-bs-theme="dark"] .version-details code {
  background-color: var(--bs-gray-800);
  color: var(--bs-gray-200);
}
</style>