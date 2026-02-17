<script setup lang="ts">
import { useI18nStore } from '@/store/i18nStore'

const i18nStore = useI18nStore()

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  }
)
</script>

<template>
  <BFormSelect
    v-model="i18nStore.currentLanguage"
    v-bind:size="size"
  >
    <BFormSelectOption
      v-for="locale in i18nStore.getAvailableLocalesWithLabels()"
      :value="locale.value"
      :key="locale.value"
    >
      {{ locale.label }}
    </BFormSelectOption>
  </BFormSelect>
</template>
