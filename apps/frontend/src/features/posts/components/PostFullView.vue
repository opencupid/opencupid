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

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
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
      <button
        type="button"
        class="btn btn-shaded me-2 mt-2"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </button>
    </div>
    <PostCard
      :post="post"
      :show-details="true"
      class="pt-5"
      :class="{ details: true }"
      @edit="emit('edit', post)"
      @hide="emit('hide', post)"
      @delete="emit('delete', post)"
    />
  </div>
</template>
