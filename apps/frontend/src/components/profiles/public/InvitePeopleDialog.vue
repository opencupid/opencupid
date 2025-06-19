<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div>
    <h4>{{ t('profiles.invite_message') }}</h4>

    <BButton class="mb-3" variant="primary">{{ t('profiles.invite_button') }}</BButton>
  </div>
</template>
