<script setup lang="ts">
import IconSearch from '@/assets/icons/interface/search.svg'
import IconClear from '@/assets/icons/interface/cross.svg'

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
        <template #append>
          <BButton
            variant="link-secondary"
            v-if="modelValue.length"
          >
            <IconClear
              class="svg-icon-sm"
              @click.stop="$emit('update:modelValue', '')"
            />
          </BButton>
        </template>
        <BFormInput
          :model-value="modelValue"
          type="search"
          debounce="300"
          :placeholder="$t('profiles.browse.filters.search_placeholder')"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          @focus="($event.target as HTMLInputElement).select()"
          @update:model-value="$emit('update:modelValue', String($event ?? ''))"
        />
      </BInputGroup>
    </div>
  </div>
</template>
