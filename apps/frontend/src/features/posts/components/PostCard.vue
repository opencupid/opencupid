<script setup lang="ts">
import { computed, inject, nextTick, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'

import IconHide from '@/assets/icons/interface/hide.svg'
import IconShow from '@/assets/icons/interface/unhide.svg'
import IconDelete from '@/assets/icons/interface/delete.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import PostTypeBadge from './PostTypeBadge.vue'
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
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'contact', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const authStore = useAuthStore()

const isOwn = computed(() => {
  return authStore.profileId === props.post.postedById
})

const isVisible = computed(() => (props.post as any).isVisible !== false)

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const postLocation = computed(() => {
  if ('location' in props.post && props.post.location) {
    const loc = props.post.location
    return {
      country: loc.country ?? '',
      cityName: loc.cityName ?? undefined,
      lat: loc.lat ?? undefined,
      lon: loc.lon ?? undefined,
    }
  }
  return null
})

const { t } = useI18n()
const showMessageForm = ref(false)
const messageInput = ref()
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState()

const recipientProfile = computed<PublicProfileWithContext | null>(() => {
  if (!hasProfileData(props.post)) {
    return null
  }
  const profile = props.post.postedBy as any
  return {
    ...profile,
    tags: profile.tags ?? [],
    languages: profile.languages ?? [],
    location: profile.location ?? { country: '', cityName: '', lat: null, lon: null },
    introSocial: profile.introSocial ?? '',
    introDating: profile.introDating ?? '',
    conversation: profile.conversation ?? null,
    interactionContext: profile.interactionContext ?? {
      likedByMe: false,
      isMatch: false,
      passedByMe: false,
      canLike: false,
      canPass: false,
      canDate: false,
      haveConversation: false,
      canMessage: true,
      conversationId: null,
      initiated: false,
    },
  } as PublicProfileWithContext
})

const handleContact = async () => {
  if (!recipientProfile.value) return
  resetMessageSent()
  showMessageForm.value = true
  await nextTick()
  messageInput.value?.focusTextarea?.()
}

</script>

<template>
  <div class="post-wrapper position-relative w-100"
    :class="{ 'post-wrapper--invisible': isOwn && props.dimHidden && !(post as any).isVisible }">
      <!-- owner toolbar -->
    <div v-if="isOwn && showOwnerToolbar"
      class="toolbar position-absolute z-3 w-100 d-flex align-items-center justify-content-end gap-1">
      <BButton @click.stop="$emit('edit', post)" variant="link-light" size="sm" :title="$t('posts.actions.edit')">
        <IconEdit class="svg-icon" />
      </BButton>
      <BButton @click.stop="$emit('delete', post)" variant="link-light" size="sm" :title="$t('posts.actions.delete')">
        <IconDelete class="svg-icon" />
      </BButton>
      <BButton @click.stop="$emit('hide', post)" variant="link-light" size="sm"
        :title="isVisible ? $t('posts.actions.hide') : $t('posts.actions.show')">
        <IconHide v-if="isVisible" class="svg-icon" />
        <IconShow v-else class="svg-icon" />
      </BButton>
    </div>

    <PostIt class="position-relative p-2" :id="post.id" :variant="isOwn ? 'accent' : ''">
      <template #header>
        <div class="d-flex justify-content-end align-items-center">
          <PostTypeBadge :type="post.type" />
        </div>
      </template>

      <div class="post-card d-flex flex-column" :class="[
        `post-card--${post.type.toLowerCase()}`,
        {
          'post-card--own': isOwn,
        },
      ]" @click="$emit('click', post)">
        <p class="post-content flex-grow-1 flex-shrink-1">{{ post.content }}</p>

        <div class="post-meta d-flex align-items-center justify-content-start gap-2">
          <div class="text-muted " v-if="showDetails"> <!-- left col 50% can grow/shrink-->
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

          <div class="post-date text-muted flex-grow-1 d-flex align-items-center" v-if="!showDetails"> 
            <UseTimeAgo v-slot="{ timeAgo }" :time="post.createdAt">{{ timeAgo }}</UseTimeAgo>
          </div>

          <!-- location  in right column 50% can shrink -->
          <div class="location d-flex flex-shrink-1 flex-grow-1 min-w-0 justify-content-end align-items-center gap-2">
            <span v-if="postLocation" class="post-location text-muted">
              <LocationLabel
                :viewerLocation="viewerLocation"
                :location="postLocation"
                :show-country-label="false"
                :show-city="true"
                :show-country-icon="true"
                :show-only-foreign-country="true" />
            </span>
            <button
              v-if="!isOwn && hasProfileData(post)"
              class="contact-btn"
              :title="t('posts.actions.contact')"
              @click.stop="handleContact"
            >
              <IconMessage class="svg-icon" />
            </button>
          </div>
        </div>

      </div>
    </PostIt>

    <div v-if="showMessageForm" class="mt-2 px-1">
      <div v-if="!messageSent && recipientProfile">
        <SendMessageForm
          ref="messageInput"
          :recipient-profile="recipientProfile"
          :conversation-id="null"
          @message:sent="handleMessageSent"
        />
      </div>
      <div v-else class="d-flex flex-column align-items-center justify-content-center text-success py-3">
        <div class="my-2 animate__animated animate__zoomIn" style="height: 3rem">
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
.toolbar {
  opacity: 0;
  visibility: hidden;
  transition: opacity 180ms ease-in-out, visibility 0s linear 180ms;
}

.post-wrapper:hover .toolbar {
  opacity: 1;
  visibility: visible;
  transition: opacity 250ms ease-in-out;
  background-color: #000000c0;
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

.post-wrapper--invisible {
  opacity: 0.75;
}

.contact-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 150ms ease;
  line-height: 1;
}

.contact-btn:hover {
  opacity: 1;
}
</style>
