<script setup lang="ts">
import type { RelationshipStatusType } from '@zod/generated'
import { useI18n } from 'vue-i18n'
import { useEnumOptions } from '../composables/useEnumOptions'

// i18n
const { t } = useI18n()

const model = defineModel<RelationshipStatusType | null>({
  default: () => 'unspecified',
})
const { relationshipStatusOptions } = useEnumOptions(t)
const checkboxOptions = relationshipStatusOptions().filter(
  (option) => option.value !== 'unspecified'
)
</script>

<template>
  <div class="overflow-auto">
    <!-- <label>{{ t('profiles.forms.relationship_label') }}</label> -->
    <BListGroup>
      <BListGroupItem
        v-for="s in checkboxOptions"
        :key="s.value"
        class="d-flex justify-content-between align-items-center clickable"
      >
        <BFormRadio
          name="relationship"
          v-model="model"
          :id="`list-relationship-${s.value}`"
          :value="s.value"
          >{{ s.label }}</BFormRadio
        >
      </BListGroupItem>
    </BListGroup>
  </div>
</template>
