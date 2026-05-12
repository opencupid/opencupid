<script setup lang="ts">
import { inject } from 'vue'
import type { PublicCommunityDetail, OwnerCommunity } from '@zod/community/community.dto'

import CommunityCard from './CommunityCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useRouter } from 'vue-router'
import { isMdUp } from '@/lib/responsive'

const router = useRouter()

defineProps<{
  community: PublicCommunityDetail | OwnerCommunity
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', community: PublicCommunityDetail | OwnerCommunity): void
  (e: 'hide', community: PublicCommunityDetail | OwnerCommunity): void
  (e: 'delete', community: PublicCommunityDetail | OwnerCommunity): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100">
    <div
      class="d-flex justify-content-end align-items-center w-100"
      v-if="isMdUp"
    >
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <CommunityCard
      :community="community"
      :show-details="true"
      class="pt-2 pt-md-3 pt-lg-5"
      @edit="emit('edit', community)"
      @hide="emit('hide', community)"
      @delete="emit('delete', community)"
    />
  </div>
</template>
