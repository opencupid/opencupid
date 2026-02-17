<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <BSpinner
    variant="primary"
    type="grow"
    :label="t('uicomponents.spinner.spinning')"
    class="mx-1"
  />
</template>
