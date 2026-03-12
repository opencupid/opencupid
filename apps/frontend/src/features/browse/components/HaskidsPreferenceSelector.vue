<script setup lang="ts">
import { computed, useId } from 'vue'
import type { HasKidsType } from '@zod/generated'
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '@/features/shared/composables/useEnumOptions'

const { t } = useI18n()
const uid = useId()

const model = defineModel<HasKidsType[]>({
  default: () => [],
})
const { hasKidsPreferenceOptions } = useEnumOptions(t)
const allOptions = hasKidsPreferenceOptions()
const checkboxOptions = allOptions.filter((o) => o.value !== 'unspecified')
const doesntMatterLabel = allOptions.find((o) => o.value === 'unspecified')!.label
const allValues = checkboxOptions.map((o) => o.value) as HasKidsType[]

const doesntMatter = computed({
  get: () => model.value.length === 0 || model.value.length === allValues.length,
  set: () => {
    model.value = [...allValues]
  },
})

function isLastChecked(value: HasKidsType): boolean {
  return model.value.length === 1 && model.value[0] === value
}
</script>

<template>
  <div>
    <label>{{ t('profiles.forms.kids_label') }}</label>
    <BListGroup>
      <BListGroupItem
        v-for="s in checkboxOptions"
        :key="s.value"
        class="d-flex justify-content-between align-items-center"
      >
        <BFormCheckbox
          :name="`haskids-pref-${uid}`"
          v-model="model"
          :id="`list-haskids-pref-${uid}-${s.value}`"
          :value="s.value"
          :disabled="isLastChecked(s.value as HasKidsType)"
          >{{ s.label }}</BFormCheckbox
        >
      </BListGroupItem>
      <BListGroupItem class="d-flex justify-content-between align-items-center">
        <BFormCheckbox
          :id="`list-haskids-pref-${uid}-doesnt-matter`"
          v-model="doesntMatter"
          >{{ doesntMatterLabel }}</BFormCheckbox
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
