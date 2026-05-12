<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PublicCommunityDetail } from '@zod/community/community.dto'
import IconCommunity from '@/assets/icons/interface/community.svg'

const props = defineProps<{ item: PublicCommunityDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="community-map-popup cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div class="community-map-popup__icon mb-2 text-primary">
      <IconCommunity class="svg-icon" />
      <span
        v-if="item.yearFounded != null"
        class="small fw-semibold ms-2"
      >
        {{ t('community.labels.founded_since', { year: item.yearFounded }) }}
      </span>
    </div>
    <div class="community-map-popup__content">
      {{ (item.content ?? '').substring(0, 120) }}
    </div>
  </div>
</template>

<style scoped>
.community-map-popup {
  background: var(--bs-body-bg, #fff);
  font-size: 0.85rem;
  word-break: break-word;
  border-left: 3px solid var(--bs-primary, #0d6efd);
}
</style>
