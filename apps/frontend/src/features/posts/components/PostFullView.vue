<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'

import PostCard from './PostCard.vue'
import SendMessageForm from '@/features/messaging/components/SendMessageForm.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import { useMessageSentState } from '@/features/publicprofile/composables/useMessageSentState'

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const { t } = useI18n()
const showMessageForm = ref(false)
const messageInput = ref()
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState()

const hasProfileData = (post: PublicPostWithProfile | OwnerPost): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

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
  if (!recipientProfile.value) {
    return
  }
  resetMessageSent()
  showMessageForm.value = true

  await nextTick()
  messageInput.value?.focusTextarea?.()
}

watch(
  () => props.post.id,
  () => {
    showMessageForm.value = false
    resetMessageSent()
  }
)

</script>

<template>
  <div class="w-100">
    <PostCard
      :post="post"
      :show-details="true"
      :class="{ details: true }"
      @contact="handleContact"
      @edit="emit('edit', post)"
      @hide="emit('hide', post)"
      @delete="emit('delete', post)"
    />

    <div v-if="showMessageForm" class="mt-3">
      <div v-if="!messageSent && recipientProfile">
        <SendMessageForm
          ref="messageInput"
          :recipient-profile="recipientProfile"
          :conversation-id="null"
          @message:sent="handleMessageSent"
        />
      </div>
      <div v-else class="d-flex flex-column align-items-center justify-content-center h-100 text-success">
        <div class="my-4 animate__animated animate__zoomIn" style="height: 5rem">
          <IconMessage class="svg-icon-lg h-100 w-100" />
        </div>
        <h5 class="mb-4 text-center animate__animated animate__fadeInDown">
          {{ t('messaging.message_sent_success') }}
        </h5>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
