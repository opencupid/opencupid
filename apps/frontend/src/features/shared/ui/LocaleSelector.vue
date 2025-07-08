<script setup lang="ts">
import { useI18nStore } from '@/store/i18nStore'

const i18nStore = useI18nStore()

defineEmits<{
  (e: 'language:select', lang: string): void
}>()
</script>

<template>
  <ul class="language-selector list-inline text-muted mt-3">
    <li
      v-for="locale in i18nStore.getAvailableLocalesWithLabels()"
      :key="locale.value"
      class="list-inline-item me-3"
    >
      <span v-if="i18nStore.getCurrentLocale() === locale.value" class="text-primary">{{ locale.label }}</span>
      <a
        v-else
        class="text-decoration-none text-muted"
        href="#"
        @click="$emit('language:select', locale.value)"
        >{{ locale.label }}</a
      >
    </li>
  </ul>
</template>

<style scoped lang="scss">
.language-selector {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
}
</style>
