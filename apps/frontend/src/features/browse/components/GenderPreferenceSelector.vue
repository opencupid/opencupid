<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '@/features/shared/composables/useEnumOptions'
import { computed, ref, useId } from 'vue'
import { type MultiselectOption } from '@/types/multiselect'
import type { GenderType } from '@zod/generated'
import ExpandCollapseButton from '@/features/shared/ui/ExpandCollapseButton.vue'

const { t } = useI18n()
const uid = useId()

const model = defineModel<GenderType[]>({
  default: () => null,
})
const { genderOptions } = useEnumOptions(t)
const showAll = ref(false)

const allGenderOptions = genderOptions().filter(
  (o) => o.value !== 'unspecified'
) as MultiselectOption[]

const defaultGenderOptions = ['male', 'female']

const sortedOptions = computed(() => {
  if (showAll.value) return allGenderOptions

  return allGenderOptions.filter((o) => defaultGenderOptions.includes(o.value))
})
</script>

<template>
  <BListGroup class="overflow-auto gender-list">
    <BListGroupItem
      v-for="g in sortedOptions"
      :key="g.value"
      class="d-flex justify-content-between align-items-center"
    >
      <BFormCheckbox
        :name="`gender-pref-${uid}`"
        v-model="model"
        :id="`list-gender-pref-${uid}-${g.value}`"
        :value="g.value"
      >
        {{ g.label }}</BFormCheckbox
      >
    </BListGroupItem>
  </BListGroup>
  <div class="mb-md-3">
    <ExpandCollapseButton v-model="showAll" />
  </div>
</template>
