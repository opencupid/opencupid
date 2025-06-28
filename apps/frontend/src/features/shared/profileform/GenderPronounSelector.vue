<script setup lang="ts">
import type { GenderType, PronounsType } from '@zod/generated'
import { type MultiselectOption } from '@/types/multiselect'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'
import PronounSelector from './PronounSelector.vue'
import GenderSelector from './GenderSelector.vue'

// i18n
const { t } = useI18n()

export type GenderPickerModel = {
  gender: GenderType | null
  pronouns: PronounsType | null
}

const model = defineModel<GenderPickerModel>({
  default: () => ({
    gender: null,
    pronouns: null,
  }),
})

// show all gender options
const showAll = ref(false)

const gender = computed({
  get: () => model.value.gender,
  set: val => {
    model.value = {
      ...model.value,
      gender: val,
    }
    showAll.value = false
  },
})

const pronouns = computed({
  get: () => model.value.pronouns,
  set: val => {
    model.value = {
      ...model.value,
      pronouns: val,
    }
  },
})

const { genderOptions, pronounsOptions } = useEnumOptions(t)


const allGenderOptions = genderOptions().filter(
  o => o.value !== 'unspecified'
) as MultiselectOption[]
const defaultGenderOptions = ['male', 'female']

const sortedOptions = computed(() => {
  const current = allGenderOptions.find(o => o.value === gender.value)

  if (showAll.value) return allGenderOptions

  if (gender.value === 'unspecified')
    return allGenderOptions.filter(o => defaultGenderOptions.includes(o.value))

  return current ? [current] : []
})

const showPronouns = computed(() => {
  return !['unspecified', 'male', 'female'].includes(gender.value as GenderType)
})
</script>
<template>
  <div>

    <GenderSelector :sortedOptions="sortedOptions" v-model="gender" />
    <BButton
      v-if="!showAll"
      @click="() => (showAll = !showAll)"
      variant="link-secondary"
      class="m-0 p-0 w-100 text-center"
    >
      {{ t('profiles.forms.more_options') }}
    </BButton>

    <div v-if="showPronouns && !showAll" class="mt-3">
      <PronounSelector v-model="pronouns" />
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>
