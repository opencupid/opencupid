<script setup lang="ts">
import IconCross from '@/assets/icons/interface/cross.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineEmits<{
  (e: 'intent:back'): void
  (e: 'intent:block'): void
}>()
</script>

<template>
  <div class="d-flex justify-content-between align-items-center w-100">
    <button
      type="button"
      class="btn btn-shaded me-1 mt-1"
      :title="t('profiles.more_options_button_title')"
      :aria-label="t('profiles.more_options_button_title')"
      @click="$emit('intent:block')"
    >
      <IconMenuDotsVert class="svg-icon-lg" />
    </button>

    <button
      type="button"
      class="btn btn-shaded me-1 mt-1"
      :title="t('profiles.back_button_title')"
      :aria-label="t('profiles.back_button_title')"
      @click="$emit('intent:back')"
    >
      <IconCross class="svg-icon" />
    </button>
  </div>
</template>
