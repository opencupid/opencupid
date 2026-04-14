<script setup lang="ts">
import IconHome from '@/assets/icons/interface/home.svg'
import IconSearch from '@/assets/icons/interface/search.svg'

defineProps<{ modelValue: string }>()

defineEmits<{
  'update:modelValue': [value: string]
  'home:set': []
}>()
</script>

<template>
  <div class="d-flex align-items-center">
    <div class="flex-grow-1 flex-shrink-0">
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
    <BButton
      variant="link-secondary"
      size="sm"
      class="mx-1 p-0"
      :title="$t('profiles.browse.filters.locate_button_title')"
      @click="$emit('home:set')"
    >
      <IconHome class="svg-icon-md" />
    </BButton>
  </div>
</template>
