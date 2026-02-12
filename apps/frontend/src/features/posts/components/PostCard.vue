<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import IconHide from '@/assets/icons/interface/hide.svg'
import IconDelete from '@/assets/icons/interface/delete.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import PostTypeBadge from './PostTypeBadge.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

import { UseTimeAgo } from '@vueuse/components'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
  showDetails: boolean
}>()

const emit = defineEmits<{
  (e: 'click', post: PublicPostWithProfile | OwnerPost): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const postLocation = computed(() => {
  if ('location' in props.post && props.post.location) {
    return props.post.location
  }
  return null
})

const messageIntent = () => {}
</script>

<template>
  <div class="post-wrapper position-relative w-100">
    <PostIt class="position-relative p-2" :id="post.id" :variant="isOwn ? 'accent' : ''">
      <template #header>
        <div class="d-flex justify-content-between align-items-center">
          <span v-if="postLocation" class="post-location text-muted">
            <LocationLabel
              :location="postLocation"
              :show-country-label="false"
              :show-city="true"
              :show-country-icon="true"
            />
          </span>
          <span v-else></span>
          <PostTypeBadge :type="post.type" />
        </div>
      </template>

      <div
        class="post-card d-flex flex-column"
        :class="[
          `post-card--${post.type.toLowerCase()}`,
          {
            'post-card--own': isOwn,
            'post-card--invisible': isOwn && !(post as any).isVisible,
          },
        ]"
        @click="$emit('click', post)"
      >
        <p class="post-content flex-grow-1 flex-shrink-1">{{ post.content }}</p>

        <div class="post-meta text-muted flex-grow-0 flex-shrink-0" v-if="showDetails">
          <div class="d-flex justify-content-start flex-row align-items-center">
            <div v-if="hasProfileData(post)" class="d-flex align-items-center">
              <ProfileThumbnail :profile="post.postedBy" class="me-2" />
              <div>{{ post.postedBy.publicName }}</div>
            </div>
            <div>
              <UseTimeAgo v-slot="{ timeAgo }" :time="post.createdAt"> | {{ timeAgo }} </UseTimeAgo>
            </div>
          </div>
        </div>

        <div class="post-date text-muted flex-grow-0 flex-shrink-0" v-if="!showDetails">
          <UseTimeAgo v-slot="{ timeAgo }" :time="post.createdAt">{{ timeAgo }}</UseTimeAgo>
        </div>

        <!-- <div v-if="isOwn && !(post as any).isVisible" class="text-warning mt-2">
        {{ $t('posts.messages.not_visible') }}
      </div> -->

        <BButton
          v-if="!isOwn && showDetails"
          size="lg"
          class="contact-btn btn-icon-lg position-absolute bottom-0 end-0 m-2"
          key="save"
          @click="messageIntent"
          variant="primary"
          :title="$t('posts.actions.contact')"
        >
          <IconMessage class="svg-icon-lg" />
        </BButton>
      </div>
    </PostIt>

    <!-- owner toolbar -->
    <div
      v-if="isOwn"
      class="toolbar position-absolute end-0 bottom-0 w-100 d-flex align-items-center justify-content-end gap-1"
    >
      <BButton
        @click.stop="$emit('edit', post)"
        variant="link-primary"
        size="sm"
        :title="$t('posts.actions.edit')"
      >
        <IconEdit class="svg-icon" />
      </BButton>
      <BButton
        @click.stop="$emit('delete', post)"
        variant="link-danger"
        size="sm"
        :title="$t('posts.actions.delete')"
      >
        <IconDelete class="svg-icon" />
      </BButton>
      <BButton
        @click.stop="$emit('hide', post)"
        variant="link-warning"
        size="sm"
        :title="$t('posts.actions.hide')"
      >
        <IconHide class="svg-icon" />
      </BButton>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  visibility: hidden;
}
.post-wrapper:hover .toolbar {
  visibility: visible;
}
.post-content {
  max-height: 5rem;
  overflow: hidden;
}
.details .post-content {
  max-height: 12rem;
  overflow: auto;
}
.post-date {
  font-size: 0.7rem;
  margin-top: 0.25rem;
}
.post-meta {
  font-size: 0.8rem;
}
.post-location {
  font-size: 0.75rem;
}
</style>
