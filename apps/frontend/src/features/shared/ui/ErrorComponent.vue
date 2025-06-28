<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  error: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="props.error" class="alert alert-danger mb-4">
    <h4>{{ t('uicomponents.error.title') }}</h4>
    {{ props.error }}
  </div>
</template>
