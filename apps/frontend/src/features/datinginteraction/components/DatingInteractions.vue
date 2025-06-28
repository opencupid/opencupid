<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import InteractionButtons from './InteractionButtons.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import { useDatingInteractions } from '../composables/useDatingInteractions'
import { useToast } from 'vue-toastification'
const toast = useToast()

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const emit = defineEmits<{
  (e: 'intent:message', conversationId: string): void
  (e: 'updated'): void
}>()

const showMessageModal = ref(false)

const { like, unlike, pass, unpass, refreshInteractions, loadingLikes } = useDatingInteractions()

const handleLike = async () => {
  await like(props.profile.id)
  emit('updated')
  toast('Successfully liked profile')
}

const handlePass = async () => {
  await pass(props.profile.id)
  emit('updated')
  toast('Successfully passed profile')
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
      :canLike="props.profile.interactionContext.canLike"
      :canPass="props.profile.interactionContext.canPass"
      :canMessage="props.profile.conversationContext.canMessage"
    />
    <SendMessageDialog v-model="showMessageModal" :profile="props.profile" @sent="emit('updated')" />
  </div>
</template>
