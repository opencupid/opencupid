<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <h4>{{ t('messaging.send_message') }}</h4>
</template>
