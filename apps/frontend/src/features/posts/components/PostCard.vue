<template>
  <div
    class="post-card"
    :class="[`post-card--${post.type.toLowerCase()}`, { 'post-card--own': isOwn }]"
    @click="$emit('click', post)"
  >
    <div class="post-card__header">
      <div class="post-card__profile">
        <div class="post-card__avatar">
          <ProfileThumbnail
            v-if="hasProfileData(post)"
            :profile="post.postedBy"
            :size="40"
            :placeholder="true"
          />
        profile
        </div>
        <div class="post-card__profile-info">
          <div class="post-card__name">
            {{ hasProfileData(post) ? post.postedBy.publicName : 'Unknown User' }}
          </div>
          <div class="post-card__date">{{ formatDate(post.createdAt) }}</div>
        </div>
      </div>

      <div class="post-card__type">
        <span class="post-type-badge" :class="`post-type-badge--${post.type.toLowerCase()}`">
          {{ $t(`posts.types.${post.type}`) }}
        </span>
      </div>
    </div>

    <div class="post-card__content">
      <p class="post-card__text">{{ post.content }}</p>
    </div>

    <div v-if="isOwn" class="">
      <BButton
        @click.stop="$emit('edit', post)"
        class="action-btn action-btn--edit"
        variant="link"
        :title="$t('posts.actions.edit')"
      >
        <IconEdit class="svg-icon" />
      </BButton>
      <BButton
        @click.stop="$emit('delete', post)"
        class="action-btn action-btn--delete"
        variant="link"
        :title="$t('posts.actions.delete')"
      >
        <IconTrash class="svg-icon" />
      </BButton>
    </div>

    <div v-if="isOwn && !(post as any).isVisible" class="post-card__visibility-notice">
      {{ $t('posts.messages.not_visible') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

import IconTrash from '@/assets/icons/interface/eraser.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'


interface Props {
  post: PublicPostWithProfile | OwnerPost
}

interface Emits {
  (e: 'click', post: PublicPostWithProfile | OwnerPost): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}d ago`
  } else {
    return dateObj.toLocaleDateString()
  }
}
</script>

<style scoped>
.post-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-left: 4px solid transparent;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.post-card--offer {
  border-left-color: #10b981;
}

.post-card--request {
  border-left-color: #3b82f6;
}

.post-card--own {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.post-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.post-card__profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.post-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
}

.post-card__profile-info {
  min-width: 0;
}

.post-card__name {
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-card__date {
  font-size: 0.875rem;
  color: #6b7280;
}

.post-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.post-type-badge--offer {
  background: #d1fae5;
  color: #065f46;
}

.post-type-badge--request {
  background: #dbeafe;
  color: #1e40af;
}

.post-card__content {
  margin-bottom: 1rem;
}

.post-card__text {
  color: #374151;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
}

.post-card__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f3f4f6;
}

.action-btn--delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.action-icon {
  width: 1rem;
  height: 1rem;
}

.post-card__visibility-notice {
  font-size: 0.75rem;
  color: #f59e0b;
  font-style: italic;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #fde68a;
}
</style>
