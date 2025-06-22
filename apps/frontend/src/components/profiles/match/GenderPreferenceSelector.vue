<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'
import { computed, ref } from 'vue'
import { type MultiselectOption } from '@/types/multiselect'

import type { GenderType } from '@zod/generated'

const { t } = useI18n()

const model = defineModel<GenderType[] | null>({
  default: () => null,
})
const { genderOptions } = useEnumOptions(t)
const showAll = ref(false)

const allGenderOptions = genderOptions().filter(
  o => o.value !== 'unspecified'
) as MultiselectOption[]

const defaultGenderOptions = ['male', 'female']

const sortedOptions = computed(() => {
  if (showAll.value) return allGenderOptions

  return allGenderOptions.filter(o => defaultGenderOptions.includes(o.value))
})

</script>

<template>
  <BListGroup class="overflow-scroll" style="max-height: 40vh">
    <BListGroupItem
      v-for="g in sortedOptions"
      :key="g.value"
      class="d-flex justify-content-between align-items-center"
    >
      <BFormCheckbox name="gender" v-model="model" :id="`list-gender-${g.value}`" :value="g.value">
        {{ g.label }}</BFormCheckbox
      >
    </BListGroupItem>
  </BListGroup>
  <div class="my-3 ">
   <BButton
    v-if="!showAll"
    @click="() => (showAll = !showAll)"
    variant="link-secondary"
    class="m-0 p-0 w-100 text-center"
  >
    {{ t('profiles.forms.more_options') }}
  </BButton>
 </div>
</template>
