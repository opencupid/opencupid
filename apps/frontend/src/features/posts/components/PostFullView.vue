<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useI18n } from 'vue-i18n'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
// Simple icons
import PostCardPostIt from './PostCardPostIt.vue'

import { UseTimeAgo } from '@vueuse/components'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const handleDelete = () => {
  emit('delete', props.post)
}
</script>

<template>
  <PostCardPostIt :post="post" :show-details="true" />

  <div v-if="isOwn" class="post-meta-section">
    <small class="text-muted">
      <span class="meta-label">{{ $t('posts.labels.updated') }}:</span>
      <span class="meta-value"> <UseTimeAgo :time="post.createdAt" /></span>
    </small>
  </div>

  <div v-if="!isOwn" class="post-full-view__actions">
    <!-- Future: Add contact/message buttons here -->
    <BButton variant="primary" disabled> Contact (Coming Soon) </BButton>
  </div>
</template>

<style scoped></style>
