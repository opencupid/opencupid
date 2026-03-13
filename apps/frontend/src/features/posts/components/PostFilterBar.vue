<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'

import type { LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PostTypeType } from '@zod/generated'

type PostScope = 'all' | 'recent' | 'my'

const location = defineModel<LocationDTO>('location', { required: true })

defineProps<{
  viewerProfile: OwnerProfile | null
  scope: PostScope
  type: PostTypeType | ''
}>()

const emit = defineEmits<{
  'update:scope': [value: PostScope]
  'update:type': [value: PostTypeType | '']
}>()

const { t } = useI18n()

function onScopeChange(value: unknown) {
  emit('update:scope', value as PostScope)
}

function onTypeChange(value: unknown) {
  emit('update:type', value as PostTypeType | '')
}
</script>

<template>
  <div
    class="filter-area flex-grow-1"
    @click.stop
  >
    <div class="row g-2">
      <!-- Location column -->
      <div class="col-12 col-md-6">
        <LocationFilterInput
          v-model="location"
          :viewer-profile="viewerProfile"
        />
      </div>
      <!-- Scope + Type column -->
      <div class="col-12 col-md-6">
        <div class="d-flex align-items-center gap-2">
          <BFormSelect
            :modelValue="scope"
            @update:modelValue="onScopeChange"
            size="sm"
            class="scope-filter"
          >
            <BFormSelectOption value="all">{{ t('posts.filters.all') }}</BFormSelectOption>
            <BFormSelectOption value="recent">{{ t('posts.filters.recent') }}</BFormSelectOption>
            <BFormSelectOption value="my">{{ t('posts.my_posts') }}</BFormSelectOption>
          </BFormSelect>

          <BFormSelect
            :modelValue="type"
            @update:modelValue="onTypeChange"
            size="sm"
            class="type-filter"
          >
            <BFormSelectOption value="">{{ t('posts.filters.all') }}</BFormSelectOption>
            <BFormSelectOption value="OFFER">{{ t('posts.filters.offers') }}</BFormSelectOption>
            <BFormSelectOption value="REQUEST">{{ t('posts.filters.requests') }}</BFormSelectOption>
          </BFormSelect>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scope-filter,
.type-filter {
  width: auto;
  min-width: 0;
  flex-shrink: 0;
  font-size: 0.85rem;
  border-color: transparent;
  background-color: transparent;
  padding-right: 1.75rem;

  &:focus {
    border-color: var(--bs-primary);
    box-shadow: none;
  }
}
</style>
