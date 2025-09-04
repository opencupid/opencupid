<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import IconTrash from '@/assets/icons/interface/hide.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'
import PostTypeBadge from './PostTypeBadge.vue'

import { UseTimeAgo } from '@vueuse/components'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
  showDetails: boolean
}>()

const emit = defineEmits<{
  (e: 'click', post: PublicPostWithProfile | OwnerPost): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}
</script>

<template>
  <PostIt class="position-relative">
    <div
      class="post-card"
      :class="[`post-card--${post.type.toLowerCase()}`, { 'post-card--own': isOwn }]"
      @click="$emit('click', post)"
    >
      <div class="d-flex justify-content-between align-items-center mb-2">
        <PostTypeBadge :post="post" class="m-2"/>
      </div>

      <div class="post-card__content">
        <p class="post-card__text">{{ post.content }}</p>
        <div class="fs-6" v-if="showDetails">
          <UseTimeAgo :time="post.createdAt" />
        </div>
      </div>

      <div v-if="showDetails && hasProfileData(post)" class="d-flex align-items-center mb-2">
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
/* .post-type-badge {
  position: absolute;
  margin-top: -1rem;
  margin-left: -1rem;
  padding: 0.25rem 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
} */
</style>
