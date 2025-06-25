<script setup lang="ts">
import { useI18nStore } from '@/store/i18nStore'
import { useI18n } from 'vue-i18n'

const i18nStore = useI18nStore()
const { t } = useI18n()
</script>

<template>
  <div class="language-selector">
    <label for="language-selector" class="form-label">{{ t('settings.language_label') }}</label>
    <BFormSelect v-model="i18nStore.currentLanguage" size="sm" class="mt-3" id="language-selector">
      <BFormSelectOption
        v-for="locale in i18nStore.getAvailableLocalesWithLabels()"
        :value="locale.value"
        :key="locale.value"
      >
        {{ locale.label }}
      </BFormSelectOption>
    </BFormSelect>
  </div>
</template>
