<script setup lang="ts">
import IconSearch from '@/assets/icons/interface/search.svg'

defineProps<{ modelValue: string }>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="d-flex align-items-center min-w-0">
    <div class="flex-grow-1 flex-shrink-1 d-flex align-items-center min-w-0">
      <BInputGroup
        class="input-group d-flex align-items-center w-100"
        size="sm"
      >
        <template #prepend>
          <IconSearch
            class="svg-icon ms-2 text-secondary"
            :title="$t('profiles.forms.city_search_placeholder')"
          />
        </template>
        <BFormInput
          :model-value="modelValue"
          debounce="300"
          placeholder="Search"
          @update:model-value="$emit('update:modelValue', String($event ?? ''))"
        />
      </BInputGroup>
    </div>
  </div>
</template>
