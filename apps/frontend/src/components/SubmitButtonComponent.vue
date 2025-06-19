<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

</script>

<template>
  <div class="d-grid gap-2 mb-3">
    <button type="submit" class="btn btn-primary" :disabled="isLoading">
      <span v-if="isLoading">{{ t('uicomponents.submitbutton.working') }}</span>
      <span v-else>{{ t('uicomponents.submitbutton.save') }}</span>
    </button>
  </div>
</template>
