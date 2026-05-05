<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

import { type PublicProfile } from '@zod/profile/profile.dto'

import InteractionButtons from './InteractionButtons.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import MatchPopup from './MatchPopup.vue'

import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import { useToast } from 'vue-toastification'
import { type InteractionEdgePair } from '@zod/interaction/interaction.dto'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
  profile: PublicProfile
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

const { like, pass, updateLike, refreshInteractions, fetchContext, contextFor } =
  useInteractionsViewModel()

const context = contextFor(props.profile.id)

const handleLike = async (isAnonymous: boolean) => {
  const result = await like(props.profile.id, isAnonymous)
  if (result.success) {
    match.value = result.data
    if (match.value?.isMatch) {
      showMatchModal.value = true
    } else {
      emit('liked')
      toast.info(t('interactions.you_smiled_at', { name: props.profile.publicName }))
    }
  } else {
    toast.error(t('interactions.like_error'))
  }
}

const handlePass = async () => {
  await pass(props.profile.id)
  emit('passed')
}

const handleAnonymousUpdate = async (isAnonymous: boolean) => {
  const result = await updateLike(props.profile.id, isAnonymous)
  if (!result.success) {
    toast.error(t('interactions.like_error'))
  }
}

const handleMessageIntent = () => {
  const ctx = context.value
  if (!ctx) return
  if (ctx.haveConversation && ctx.conversationId) {
    emit('intent:message', ctx.conversationId)
    return
  }
  if (ctx.canMessage) {
    showMessageModal.value = true
  }
}

watch(
  () => props.profile.id,
  (id) => {
    if (id) fetchContext(id)
  },
  { immediate: true }
)

onMounted(async () => {
  await refreshInteractions()
})
</script>

<template>
  <div
    v-if="context"
    class="profile-interactions d-flex justify-content-center align-items-center gap-2"
  >
    <InteractionButtons
      @message="handleMessageIntent"
      @pass="handlePass"
      @like="handleLike"
      @update:anonymous="handleAnonymousUpdate"
      :context="context"
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
