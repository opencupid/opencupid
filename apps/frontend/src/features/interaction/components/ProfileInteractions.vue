<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import InteractionButtons from './InteractionButtons.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import MatchPopup from './MatchPopup.vue'

import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import { useToast } from 'vue-toastification'
import { type InteractionEdgePair } from '@zod/interaction/interaction.dto'

const toast = useToast()

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const emit = defineEmits<{
  (e: 'intent:message', conversationId: string): void
  (e: 'liked'): void
  (e: 'passed'): void
  (e: 'updated'): void
}>()

const showMessageModal = ref(false)
const showMatchModal = ref(false)
const match = ref<InteractionEdgePair>()

const { like, pass, refreshInteractions, isLoading } = useInteractionsViewModel()

const handleLike = async () => {
  const result = await like(props.profile.id)
  if (result.success) {
    match.value = result.data
    if (match.value?.isMatch) {
      showMatchModal.value = true
    } else {
      emit('liked')
      emit('updated')
    }
  } else {
    toast.error('Failed to like profile. Please try again.')
  }
}

const handlePass = async () => {
  await pass(props.profile.id)
  emit('passed')
  emit('updated')
}

const handleMessageIntent = () => {
  const context = props.profile.interactionContext
  if (context.haveConversation && context.conversationId) {
    emit('intent:message', context?.conversationId)
    return
  }
  if (context.canMessage) {
    showMessageModal.value = true
  }
}

onMounted(async () => {
  await refreshInteractions()
})
</script>

<template>
  <div
    v-if="profile.interactionContext"
    class="d-flex justify-content-center align-items-center gap-2"
  >
    <InteractionButtons
      @message="handleMessageIntent"
      @pass="handlePass"
      @like="handleLike"
      :context="profile.interactionContext"
    />
    <SendMessageDialog
      v-model="showMessageModal"
      :profile="props.profile"
      @sent="emit('updated')"
    />
    <MatchPopup
      v-if="match"
      :show="showMatchModal"
      :profile="props.profile"
      :match="match"
      @messaged="$emit('updated')"
      @close="showMatchModal = false"
    />
  </div>
</template>
