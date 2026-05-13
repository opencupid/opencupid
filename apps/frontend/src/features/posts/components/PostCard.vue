<script setup lang="ts">
import { computed, inject, nextTick, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { OwnerProfile, MessageRecipient } from '@zod/profile/profile.dto'

import PostTypeBadge from './PostTypeBadge.vue'
import OwnerToolbar from './OwnerToolbar.vue'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import ContactFormPanel from '@/features/messaging/components/ContactFormPanel.vue'

import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
  showDetails: boolean
}>()

const ownerProfile = inject<Ref<OwnerProfile | null>>('ownerProfile', ref(null))
const viewerLocation = computed(() => ownerProfile?.value?.location ?? undefined)

const emit = defineEmits<{
  (e: 'click', post: PublicPostWithProfile | OwnerPost): void
  (e: 'contact', post: PublicPostWithProfile): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const isVisible = computed(() => !('isVisible' in props.post) || props.post.isVisible !== false)

const postLocation = computed(() => props.post.location ?? null)

const GRID_TRUNCATE_LENGTH = 100

const displayContent = computed(() => {
  const content = props.post.content
  if (props.showDetails || content.length <= GRID_TRUNCATE_LENGTH) return content
  const truncated = content.substring(0, GRID_TRUNCATE_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '\u2026'
})

const { t } = useI18n()
const showMessageForm = ref(false)
const messageInput = ref<InstanceType<typeof ContactFormPanel> | null>(null)

const recipientProfile = computed<MessageRecipient>(() => props.post.postedBy)

const handleContact = async () => {
  showMessageForm.value = true
  await nextTick()
  messageInput.value?.focusTextarea?.()
}

const sharePostPayload = computed<SharePayload>(() => ({
  title: props.post.content.substring(0, 80),
  text: t('posts.share.post_text', { publicName: props.post.postedBy.publicName }),
  url: `${window.location.origin}/posts/${props.post.id}`,
}))
</script>

<template>
  <div class="post-wrapper position-relative w-100 p-2">
    <PostIt
      class="position-relative p-2"
      variant="post"
      :id="post.id"
    >
      <template #header>
        <div class="d-flex justify-content-end align-items-center">
          <PostTypeBadge :type="post.type" />
        </div>
      </template>

      <div
        class="post-card d-flex flex-column"
        :class="[
          `post-card--${post.type.toLowerCase()}`,
          {
            'post-card--own': post.isOwn,
          },
        ]"
        @click="$emit('click', post)"
      >
        <p class="post-content flex-grow-1 flex-shrink-1">{{ displayContent }}</p>

        <div class="post-meta d-flex align-items-center justify-content-start gap-2">
          <div
            class="text-muted"
            v-if="showDetails"
          >
            <!-- left col 50% can grow/shrink-->
            <div class="d-flex justify-content-start flex-row align-items-center">
              <div class="d-flex align-items-center">
                <OwnerToolbar
                  v-if="post.isOwn"
                  :is-visible="isVisible"
                  @edit="$emit('edit', post)"
                  @delete="$emit('delete', post)"
                  @hide="$emit('hide', post)"
                />
                <div
                  v-else
                  class="d-flex align-items-center"
                >
                  <ProfileThumbnail
                    :profile="post.postedBy"
                    class="me-2"
                  />
                  <div>
                    <div>{{ post.postedBy.publicName }}</div>
                    <LocalizedTimeAgo
                      v-slot="{ timeAgo }"
                      :time="post.createdAt"
                    >
                      {{ timeAgo }}
                    </LocalizedTimeAgo>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class=""
            v-if="!showDetails"
          >
            <div class="post-date text-muted small">
              <LocalizedTimeAgo
                v-slot="{ timeAgo }"
                :time="post.createdAt"
                >{{ timeAgo }}</LocalizedTimeAgo
              >
            </div>
            <OwnerToolbar
              v-if="post.isOwn"
              :is-visible="isVisible"
              @edit="$emit('edit', post)"
              @delete="$emit('delete', post)"
              @hide="$emit('hide', post)"
            />
          </div>

          <!-- location  in right column 50% can shrink -->
          <div
            class="location d-flex flex-shrink-1 flex-grow-1 min-w-0 justify-content-end align-items-center gap-2"
          >
            <span
              v-if="postLocation"
              class="post-location text-muted"
            >
              <LocationLabel
                :viewerLocation="viewerLocation"
                :location="postLocation"
                :show-country-label="false"
                :show-city="true"
                :show-country-icon="true"
                :show-only-foreign-country="true"
              />
            </span>
            <ViewerToolbar
              v-if="showDetails && !post.isOwn"
              :actions="['contact', 'copy', 'share']"
              :copy-text="post.content"
              :share-payload="sharePostPayload"
              @contact="handleContact"
            />
          </div>
        </div>
      </div>
    </PostIt>

    <div
      v-if="showMessageForm"
      class="mt-2 px-2"
    >
      <ContactFormPanel
        ref="messageInput"
        :recipient-profile="recipientProfile"
      />
    </div>
  </div>
</template>

<style scoped>
.post-wrapper .toolbar {
  z-index: 10;
  opacity: 0;
}

.toolbar {
  top: 0.3rem;
  right: 0.3rem;
  border-radius: var(--radius-md);
}

.post-wrapper:hover .toolbar {
  opacity: 1 !important;
  background-color: rgba(0, 0, 0, 0.45);
  transition: opacity 180ms ease-in-out;
}

.post-content {
  max-height: 5rem;
  overflow: hidden;
  font-family: 'Patrick Hand', cursive;
  /* font-size: 2rem; */
}

.details .post-content {
  max-height: 40vh;
  overflow-y: auto;
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
