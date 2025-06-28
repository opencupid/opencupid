<script setup lang="ts">
import type { PronounsType } from '@zod/generated'
import { type MultiselectOption } from '@/types/multiselect'

import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'

// i18n
const { t } = useI18n()

const model = defineModel<PronounsType | null>({
  default: () => null,
})

const { pronounsOptions } = useEnumOptions(t)

const pronounsChoices = pronounsOptions() as MultiselectOption[]
</script>

<template>
  <div>
    <label>{{ t('profiles.forms.pronouns_label') }}</label>
    <BListGroup>
      <BListGroupItem
        v-for="p in pronounsChoices"
        :key="p.value"
        class="d-flex justify-content-between align-items-center"
      >
        <BFormRadio
          name="pronouns"
          v-model="model"
          :id="`list-pronouns-${p.value}`"
          :value="p.value"
          >{{ p.label }}</BFormRadio
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
