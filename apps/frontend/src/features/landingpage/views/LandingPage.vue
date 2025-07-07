<script lang="ts" setup>
import { ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'
import LocaleSelector from '../../shared/ui/LocaleSelector.vue'

const i18nStore = useI18nStore()

const loading = ref(false)

async function enterApp() {
  loading.value = true
  const { bootstrapApp } = await import('../../../app')
  await bootstrapApp()
}

const handleSetLanguage = (lang: string) => {
  i18nStore.setLanguage(lang)
}
</script>

<template>
  <BContainer class="py-2">
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
    <div class="d-flex justify-content-center align-items-center mt-3 text-center">
      <LocaleSelector @language:select="(lang: string) => handleSetLanguage(lang)" />
    </div>
    <div class="position-fixed bottom-0 start-0 p-3 w-100 text-center">
      <BButton variant="primary" @click="enterApp" :disabled="loading">
        {{ loading ? 'Loading...' : 'Enter App' }}
      </BButton>
    </div>
  </BContainer>
</template>
