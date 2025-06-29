<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import InteractionButtons from './InteractionButtons.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import MatchPopup from './MatchPopup.vue'

import { useDatingInteractions } from '../composables/useDatingInteractions'
import { useToast } from 'vue-toastification'
import { type InteractionEdgePair } from '@zod/datinginteraction/datinginteraction.dto'

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

const { like, pass, refreshInteractions, loadingLikes } = useDatingInteractions()

const handleLike = async () => {
  const result = await like(props.profile.id)
  emit('liked')
  emit('updated')
  if (result.success) {
    match.value = result.data
    if (match.value?.isMatch) {
      showMatchModal.value = true
    } else {
      toast('Successfully liked profile')
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
  const context = props.profile.conversationContext
  if (context.haveConversation && context.conversationId) {
    emit('intent:message', context?.conversationId)
    return
  }
  if (context.canMessage) {
    showMessageModal.value = true
  }
}

onMounted(() => {
  refreshInteractions()
})
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <InteractionButtons
      @message="handleMessageIntent"
      @pass="handlePass"
      @like="handleLike"
      :context="props.profile.interactionContext"
    />
    <SendMessageDialog
      v-model="showMessageModal"
      :profile="props.profile"
      @sent="emit('updated')"
    />
    <MatchPopup
      v-if="match"
      :show="showMatchModal"
      :profile="profile"
      :match="match"
      @close="showMatchModal = false"
    />
  </div>
</template>
