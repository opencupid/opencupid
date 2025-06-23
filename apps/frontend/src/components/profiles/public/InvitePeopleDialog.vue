<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <BModal
    centered
    :no-footer="true"
    :no-header="true"
    :backdrop-first="false"
    no-animation
    title="Help spread the word!"
  >
    <h4>{{ t('profiles.invite_message') }}</h4>

    <BButton class="mb-3" variant="primary">{{ t('profiles.invite_button') }}</BButton>
  </BModal>
</template>
