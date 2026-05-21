<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PublicCommunityDetail } from '@zod/community/community.dto'
import IconCommunity from '@/assets/icons/interface/community.svg'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'

defineProps<{ item: PublicCommunityDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { t } = useI18n()
</script>

<template>
  <UserContentMapPopup :item="item">
    <template #content>
      <div class="bg-community-light text-primary d-flex flex-row p-2">
        <IconCommunity class="svg-icon flex-shrink-0 flex-grow-0 me-2" />
        <div class="flex-grow-1">
          <div class="mb-1">
            {{ (item.content ?? '').substring(0, 120) }}
          </div>
          <div
            v-if="item.yearFounded != null"
            class="small text-secondary fw-semibold"
          >
            {{ t('community.labels.founded_since', { year: item.yearFounded }) }}
          </div>
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>
