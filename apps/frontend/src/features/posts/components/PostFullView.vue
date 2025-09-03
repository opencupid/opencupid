<template>
  <div class="post-full-view">
    <div class="post-full-view__header">
      <h3 class="post-full-view__title">{{ $t(`posts.types.${post.type}`) }}</h3>
      <button @click="$emit('close')" class="close-btn">
        <CloseIcon class="close-icon" />
      </button>
    </div>

    <div class="post-full-view__content">
      <div class="post-full-view__profile">
        <div class="profile-avatar">
          <img 
            v-if="hasProfileData(post) && post.postedBy.profileImages?.[0]?.url" 
            :src="post.postedBy.profileImages[0].url"
            :alt="post.postedBy.profileImages[0].altText || 'Profile'"
            class="avatar-image"
          >
          <div v-else class="avatar-placeholder">
            {{ hasProfileData(post) ? post.postedBy.publicName.charAt(0).toUpperCase() : '?' }}
          </div>
        </div>
        <div class="profile-info">
          <h4 class="profile-name">{{ hasProfileData(post) ? post.postedBy.publicName : 'Unknown User' }}</h4>
          <p class="post-date">{{ formatDate(post.createdAt) }}</p>
        </div>
      </div>

      <div class="post-type-section">
        <span class="post-type-badge" :class="`post-type-badge--${post.type.toLowerCase()}`">
          {{ $t(`posts.types.${post.type}`) }}
        </span>
      </div>

      <div class="post-content-section">
        <h5 class="content-label">{{ $t('posts.labels.content') }}</h5>
        <div class="post-content">
          <p class="post-text">{{ post.content }}</p>
        </div>
      </div>

      <div v-if="isOwn" class="post-meta-section">
        <div class="meta-item">
          <span class="meta-label">{{ $t('posts.labels.visibility') }}:</span>
          <span :class="['meta-value', { 'meta-value--warning': !(post as any).isVisible }]">
            {{ (post as any).isVisible ? 'Visible' : 'Hidden' }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('posts.labels.updated') }}:</span>
          <span class="meta-value">{{ formatDate(post.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <div v-if="isOwn" class="post-full-view__actions">
      <button 
        @click="$emit('edit', post)"
        class="action-btn action-btn--edit"
      >
        <EditIcon class="action-icon" />
        {{ $t('posts.actions.edit') }}
      </button>
      <button 
        @click="handleDelete"
        class="action-btn action-btn--delete"
      >
        <TrashIcon class="action-icon" />
        {{ $t('posts.actions.delete') }}
      </button>
    </div>

    <div v-if="!isOwn" class="post-full-view__actions">
      <!-- Future: Add contact/message buttons here -->
      <button class="action-btn action-btn--contact" disabled>
        Contact (Coming Soon)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useI18n } from 'vue-i18n'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

// Simple icons
const CloseIcon = { template: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>' }
const EditIcon = { template: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.828-2.828z" /></svg>' }
const TrashIcon = { template: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>' }

interface Props {
  post: PublicPostWithProfile | OwnerPost
}

interface Emits {
  (e: 'close'): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const handleDelete = () => {
  emit('delete', props.post)
}
</script>

<style scoped>
.post-full-view {
  padding: 2rem;
  max-height: 80vh;
  overflow-y: auto;
}

.post-full-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.post-full-view__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.close-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.close-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
}

.post-full-view__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.post-full-view__profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-avatar {
  width: 60px;
  height: 60px;
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
  font-size: 1.5rem;
}

.profile-info {
  min-width: 0;
}

.profile-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.post-date {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.post-type-section {
  display: flex;
  justify-content: center;
}

.post-type-badge {
  padding: 0.5rem 1.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
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

.post-content-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
}

.content-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.post-content {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.post-text {
  color: #374151;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.post-meta-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.meta-value {
  font-size: 0.875rem;
  color: #111827;
}

.meta-value--warning {
  color: #f59e0b;
  font-weight: 500;
}

.post-full-view__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn--edit {
  background: #3b82f6;
  color: white;
}

.action-btn--edit:hover:not(:disabled) {
  background: #2563eb;
}

.action-btn--delete {
  background: #dc2626;
  color: white;
}

.action-btn--delete:hover:not(:disabled) {
  background: #b91c1c;
}

.action-btn--contact {
  background: #10b981;
  color: white;
}

.action-btn--contact:hover:not(:disabled) {
  background: #059669;
}

.action-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .post-full-view {
    padding: 1rem;
  }
  
  .post-full-view__actions {
    flex-direction: column;
  }
  
  .action-btn {
    justify-content: center;
  }
}
</style>