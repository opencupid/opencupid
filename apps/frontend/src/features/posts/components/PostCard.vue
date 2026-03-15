<script setup lang="ts">
import { computed, inject, nextTick, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { OwnerProfile, MessageRecipient } from '@zod/profile/profile.dto'

import IconMessage from '@/assets/icons/interface/message.svg'
import PostTypeBadge from './PostTypeBadge.vue'
import OwnerToolbar from './OwnerToolbar.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import SendMessageForm from '@/features/messaging/components/SendMessageForm.vue'
import { useMessageSentState } from '@/features/publicprofile/composables/useMessageSentState'

import { UseTimeAgo } from '@vueuse/components'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
  showDetails: boolean
  dimHidden?: boolean
  showOwnerToolbar?: boolean
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
const messageInput = ref()
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState()

const recipientProfile = computed<MessageRecipient>(() => props.post.postedBy)

const handleContact = async () => {
  resetMessageSent()
  showMessageForm.value = true
  await nextTick()
  messageInput.value.focusTextarea?.()
}
</script>

<template>
  <div
    class="post-wrapper position-relative w-100"
    :class="{
      'post-wrapper--invisible': post.isOwn && props.dimHidden && !(post as any).isVisible,
    }"
  >
    <PostIt
      class="position-relative p-2"
      :id="post.id"
      :variant="post.isOwn ? 'accent' : ''"
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
                  <div>{{ post.postedBy.publicName }}</div>
                  <UseTimeAgo
                    v-slot="{ timeAgo }"
                    :time="post.createdAt"
                  >
                    | {{ timeAgo }}
                  </UseTimeAgo>
                </div>
              </div>
            </div>
          </div>

          <div
            class=""
            v-if="!showDetails"
          >
            <div class="post-date text-muted small">
              <UseTimeAgo
                v-slot="{ timeAgo }"
                :time="post.createdAt"
                >{{ timeAgo }}</UseTimeAgo
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
            <button
              v-if="showDetails && !post.isOwn"
              class="contact-btn"
              :title="t('posts.actions.contact')"
              :aria-label="t('posts.actions.contact')"
              @click.stop="handleContact"
            >
              <IconMessage class="svg-icon-lg" />
            </button>
          </div>
        </div>
      </div>
    </PostIt>

    <div
      v-if="showMessageForm"
      class="mt-2 px-1"
    >
      <div v-if="!messageSent">
        <SendMessageForm
          ref="messageInput"
          :recipient-profile="recipientProfile"
          :conversation-id="null"
          @message:sent="handleMessageSent"
        />
      </div>
      <div
        v-else
        class="d-flex flex-column align-items-center justify-content-center text-success py-3"
      >
        <div
          class="my-2 animate__animated animate__zoomIn"
          style="height: 3rem"
        >
          <IconMessage class="svg-icon-lg h-100 w-100" />
        </div>
        <h6 class="mb-2 text-center animate__animated animate__fadeInDown">
          {{ t('messaging.message_sent_success') }}
        </h6>
      </div>
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

.post-wrapper--invisible {
  opacity: 0.75;
}

.contact-btn {
  background: none;
  border: none;
  padding: 0.1rem 0.2rem;
  cursor: pointer;
  color: var(--bs-dark);
  opacity: 0.7;
  transition: opacity 150ms ease;
  line-height: 1;
}

.contact-btn:hover {
  opacity: 1;
}
</style>
