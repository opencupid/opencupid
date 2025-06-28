<script setup lang="ts">
import { useLanguages } from '@/features/shared/composables/useLanguages'

import { computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import Multiselect from 'vue-multiselect'
import { type MultiselectOption } from '@/types/multiselect'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const languageOptions = reactive([] as MultiselectOption[])
const languagesComputed = computed({
  get: () => (props.modelValue ?? []).map(lang => languageOptions.find(opt => opt.value === lang)),
  set: (options: MultiselectOption[]) => {
    const newVal = options.map(opt => opt.value)
    emit('update:modelValue', newVal)
  },
})

const { getLanguageSelectorOptions } = useLanguages()
onMounted(() => {
  languageOptions.push(...getLanguageSelectorOptions())
})
</script>

<template>
  <div class="languages-multiselect">
    <Multiselect
      v-model="languagesComputed"
      :options="languageOptions"
      :close-on-select="false"
      :clear-on-select="true"
      :multiple="true"
      :searchable="true"
      open-direction="top"
      :maxHeight="250"
      id="languages"
      label="label"
      track-by="label"
      placeholder=""
      :showLabels="false"
      :showNoResults="false"
      :selectLabel="t('common.forms.multiselect.select')"
      :deselectLabel="t('common.forms.multiselect.deselect')"
    />
  </div>
</template>

<style scoped lang="scss">
:deep(.multiselect__tag) {
  background-color: var(--bs-info);
  color: var(--bs-body-bg);
  user-select: none;

  i:after {
    color: var(--bs-text-secondary);
  }
}
:deep(.multiselect__input) {
  color: var(--bs-text-secondary);
  background-color: var(--bs-body-bg);
  padding: 0.25rem 0.5rem;
}
</style>
