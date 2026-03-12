<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '@/features/shared/composables/useEnumOptions'
import { computed, ref } from 'vue'
import { type MultiselectOption } from '@/types/multiselect'
import type { GenderType } from '@zod/generated'
import ChevronsDown from '@/assets/icons/arrows/arrow-single-down.svg'
import ChevronsUp from '@/assets/icons/arrows/arrow-single-up.svg'

const { t } = useI18n()

const model = defineModel<GenderType[] | null>({
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
  <BListGroup
    class="overflow-auto"
    style="max-height: 40vh"
  >
    <BListGroupItem
      v-for="g in sortedOptions"
      :key="g.value"
      class="d-flex justify-content-between align-items-center"
    >
      <BFormCheckbox
        name="gender"
        v-model="model"
        :id="`list-gender-${g.value}`"
        :value="g.value"
      >
        {{ g.label }}</BFormCheckbox
      >
    </BListGroupItem>
  </BListGroup>
  <div class="mb-3">
    <BButton
      @click="() => (showAll = !showAll)"
      variant="link-secondary"
      class="m-0 p-0 w-100 text-center"
    >
    
      {{ showAll ? t('profiles.forms.fewer_options') : t('profiles.forms.more_options') }}
      <span><component :is="showAll ? ChevronsUp : ChevronsDown" class="svg-icon-sm me-1" /></span>
    </BButton>
    
  </div>
</template>
