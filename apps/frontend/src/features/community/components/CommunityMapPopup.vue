<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicCommunityDetail } from '@zod/community/community.dto'
import IconCommunity from '@/assets/icons/interface/community.svg'
import ImageTag from '@/features/images/components/ImageTag.vue'

const props = defineProps<{ item: PublicCommunityDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { t } = useI18n()

const firstImage = computed(() => props.item.images[0])
</script>

<template>
  <div
    class="community-map-popup bg-community-light cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div
      v-if="firstImage"
      class="popup-image ratio ratio-4x3 mb-2 rounded overflow-hidden"
    >
      <ImageTag
        :image="firstImage"
        variant="card"
      />
    </div>
    <div class="mb-2 text-primary d-flex flex-row">
      <IconCommunity class="svg-icon flex-shrink-0 flex-grow-0 me-2" />
      <div class="flex-grow-1">
        <div class="mb-1">
          {{ (item.content ?? '').substring(0, 120) }}
        </div>
        <div
          class="small text-secondary fw-semibold"
          v-if="item.yearFounded != null"
        >
          {{ t('community.labels.founded_since', { year: item.yearFounded }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-map-popup {
  word-break: break-word;
}
</style>
