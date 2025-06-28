<script setup lang="ts">
import { computed } from 'vue'
import { useLanguages } from '@/features/shared/composables/useLanguages'

const props = withDefaults(
  defineProps<{
    languages?: string[]
  }>(),
  {
    languages: () => [] as string[],
  }
)
const { getLanguageList } = useLanguages()

const languages = computed(() => {
  return getLanguageList(props.languages)
})
</script>

<template>
  <ul
    class="tags list-unstyled mb-0 d-inline-flex flex-wrap align-items-center user-select-none"
    v-if="languages && languages.length"
  >
    <li v-for="lang in languages" :key="lang.value" class="me-2">
      <BBadge variant="secondary">{{ lang.label }}</BBadge>
    </li>
  </ul>
</template>
