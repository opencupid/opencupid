<script setup lang="ts">
import type { GenderType } from '@zod/generated'
import { type MultiselectOption } from '@/types/multiselect'

import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'
import { computed } from 'vue'

import GenderSelectorTitle from '@/features/shared/ui/GenderSelectorTitle.vue'

// i18n
const { t } = useI18n()

const model = defineModel<GenderType | null>({
  default: () => null,
})
const props = defineProps<{
  sortedOptions?: MultiselectOption[]
}>()
const { genderOptions } = useEnumOptions(t)

const options = computed(() => {
  return props.sortedOptions || (genderOptions() as MultiselectOption[])
})
</script>

<template>
  <div class="w-100">
    <GenderSelectorTitle class="mb-3" />

    <BListGroup
      class="overflow-scroll"
      style="max-height: 40vh"
    >
      <BListGroupItem
        v-for="g in options"
        :key="g.value"
        class="d-flex justify-content-between align-items-center clickable"
      >
        <BFormRadio
          name="gender"
          v-model="model"
          :id="`list-gender-${g.value}`"
          :value="g.value"
          >{{ g.label }}</BFormRadio
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
