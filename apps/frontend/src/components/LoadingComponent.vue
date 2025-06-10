<template>
  <div class="loading-spinner">
    <div class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">{{ t('uicomponents.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'LoadingComponent',
  setup() {
    const { t } = useI18n()
    return { t }
  },
})
</script>
