<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="loading-spinner">
    <div class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">{{ t('uicomponents.loading.loading') }}</span>
      </div>
    </div>
  </div>
</template>
