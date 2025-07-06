<script setup lang="ts">
import type { HasKidsType } from '@zod/generated'
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'

// i18n
const { t } = useI18n()

const model = defineModel<HasKidsType|null>({
  default: () => 'unspecified',
})
const { hasKidsOptions } = useEnumOptions(t)
const checkboxOptions = hasKidsOptions().filter(
  (option) => option.value !== 'unspecified'
)
</script>

<template>
  <div>
    <label>{{ t('profiles.forms.kids_label') }}</label>
    <BListGroup>
      <BListGroupItem
        v-for="s in checkboxOptions"
        :key="s.value"
        class="d-flex justify-content-between align-items-center clickable"
      >
        <BFormRadio
          name="haskids"
          v-model="model"
          :id="`list-haskids-${s.value}`"
          :value="s.value"
        class="clickable"
          >{{ s.label }}</BFormRadio
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
