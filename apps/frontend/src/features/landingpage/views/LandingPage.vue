<script lang="ts" setup>

import { ref } from 'vue'

const loading = ref(false)

async function enterApp() {
  loading.value = true
  const { bootstrapApp } = await import('../../../app')
  await bootstrapApp()
}
</script>

<template>
  <BContainer>
    <h1 class="text-3xl font-bold mb-4">Welcome to OpenCupid!</h1>
    <p class="mb-4">
      This is the landing page of OpenCupid, a free and open-source dating platform.
    </p>
    <p class="mb-4">
      OpenCupid is designed to be a community-driven project, where users can contribute to the
      codebase, suggest features, and help shape the future of the platform.
    </p>
    <p class="mb-4">
      Feel free to explore the code, report issues, and contribute to the project on GitHub.
    </p>
    <p class="mb-4">Thank you for visiting OpenCupid!</p>

    <div class="position-fixed bottom-0 start-0 p-3 w-100 text-center">
      <BButton variant="primary" @click="enterApp" :disabled="loading">
        {{ loading ? 'Loading...' : 'Enter App' }}
      </BButton>
    </div>
  </BContainer>
</template>
