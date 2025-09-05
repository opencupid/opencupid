<script setup lang="ts">
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useI18n } from 'vue-i18n'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import PostCard from './PostCard.vue'

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


</script>

<template>
  <PostCard
    :post="post"
    :show-details="true"
    :class="{ details: true }"
    @edit="emit('edit', post)"
    @delete="emit('delete', post)"
  />
</template>

<style scoped></style>
