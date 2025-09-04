<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'



import IconTrash from '@/assets/icons/interface/hide.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'
import PostTypeBadge from './PostTypeBadge.vue'

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

<template>
  <PostIt>
    <div
      class="post-card"
      :class="[`post-card--${post.type.toLowerCase()}`, { 'post-card--own': isOwn }]"
      @click="$emit('click', post)"
    >
      <div class="d-flex justify-content-between align-items-center mb-2">
        <PostTypeBadge :post="post"   />
      </div>

      <div class="post-card__content">
        <p class="post-card__text">{{ post.content }}</p>
        <div class="fs-6">{{ formatDate(post.createdAt) }}</div>
      </div>

      <div v-if="hasProfileData(post)" class="d-flex align-items-center mb-2">
        <div class="thumbnail">
          <ProfileThumbnail :profile="post.postedBy" class="me-2" />
        </div>
        <div>
          <div>{{ post.postedBy.publicName }}</div>
        </div>
      </div>

      <div v-if="isOwn" class="post-card__actions">
        <BButton
          @click.stop="$emit('edit', post)"
          variant="link-primary"
          :title="$t('posts.actions.edit')"
        >
          <IconEdit class="svg-icon" />
        </BButton>
        <BButton
          @click.stop="$emit('delete', post)"
          variant="link-danger"
          :title="$t('posts.actions.delete')"
        >
          <IconTrash class="svg-icon" />
        </BButton>
      </div>

      <div v-if="isOwn && !(post as any).isVisible" class="text-warning mt-2">
        {{ $t('posts.messages.not_visible') }}
      </div>
    </div>
  </PostIt>
</template>

<style scoped>

.post-type-badge {
  position: absolute;
  margin-top: -1rem;
  margin-left: -1rem;
  padding: 0.25rem 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}


</style>
