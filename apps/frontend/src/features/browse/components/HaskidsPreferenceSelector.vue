<script setup lang="ts">
import type { HasKidsType } from '@zod/generated'
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '@/features/shared/composables/useEnumOptions'

// i18n
const { t } = useI18n()

const model = defineModel<HasKidsType[] | null>({
  default: () => 'unspecified',
})
const { hasKidsOptions } = useEnumOptions(t)
const checkboxOptions = hasKidsOptions().filter((o) => o.value !== 'unspecified')
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
          name="haskids"
          v-model="model"
          :id="`list-haskids-${s.value}`"
          :value="s.value"
          >{{ s.label }}</BFormCheckbox
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
