<script setup lang="ts">
import { useI18nStore } from '@/store/i18nStore'
import { useI18n } from 'vue-i18n'

const i18nStore = useI18nStore()
const { t } = useI18n()

function changeToFrench() {
  i18nStore.setLanguage('fr')
}

const labels: Record<string, string> = {
  hu: 'Magyar',
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
}
</script>

<template>
  <div class="language-selector">
    <label for="language-selector" class="form-label">{{ t('settings.language_label') }}</label>
    <BFormSelect v-model="i18nStore.currentLanguage" size="sm" class="mt-3" id="language-selector">
      <BFormSelectOption
        :value="locale"
        v-for="locale in i18nStore.getAvailableLocales()"
        :key="locale"
      >
        {{ labels[locale] || locale }}
      </BFormSelectOption>
    </BFormSelect>
  </div>
</template>
