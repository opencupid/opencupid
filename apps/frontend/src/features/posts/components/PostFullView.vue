<script setup lang="ts">
import { inject } from 'vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import PostCard from './PostCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
}>()

defineEmits<{
  (e: 'close'): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100">
    <div class="d-flex justify-content-end align-items-center w-100">
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <PostCard
      :post="post"
      :show-details="true"
      class="pt-2 pt-md-3 pt-lg-5"
      :class="{ details: true }"
    />
  </div>
</template>
