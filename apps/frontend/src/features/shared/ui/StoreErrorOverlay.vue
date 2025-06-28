<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import IconConfusedEmoji from '@/assets/icons/emojis/confused-emoji.svg'
import { type StoreError } from '@/store/helpers'

defineProps<{
  error: StoreError | null
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="error" class="d-flex align-items-center justify-content-center h-100 flex-column">
    <div
      class="d-flex align-items-center justify-content-center mb-5 mt-5 text-danger"
      style="height: 10rem"
    >
      <IconConfusedEmoji class="svg-icon-lg h-100 w-100" />
    </div>
    <div class="text-center">
      <h1 class="text-muted">{{ error.status }}</h1>
      <h4>{{ t('uicomponents.error.title') }}</h4>
      <p class="text-muted">{{ error.message }}</p>
      <!-- <pre>{{error}}</pre> -->
    </div>
    <div>
      <slot :error="error" />
    </div>
  </div>
</template>
