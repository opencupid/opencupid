<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import IconConfusedEmoji from '@/assets/icons/emojis/confused-emoji.svg'

const props = defineProps<{
  error: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="d-flex align-items-center justify-content-center h-100 flex-column">
    <div class="d-flex align-items-center justify-content-center mb-5 mt-5 text-danger" style="height: 10rem;">
      <IconConfusedEmoji class="svg-icon-lg h-100 w-100" />
    </div>
    <div class="text-center">
      <h4>{{ t('uicomponents.error.title') }}</h4>
      <h3>We've hit a snag here.</h3>
      <p class="text-muted">{{ props.error }}</p>
    </div>
  </div>
</template>
