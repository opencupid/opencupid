<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

import ConversationDetail from '../components/ConversationDetail.vue'
import { useMessageStore } from '../stores/messageStore'
import ConversationSummaries from '../components/ConversationSummaries.vue'

const router = useRouter()
const messageStore = useMessageStore()

const props = defineProps<{
  conversationId?: string
}>()

const isLoading = ref(false)

const detailVisible = computed(() => !!messageStore.activeConversation && !isLoading.value)

// Watch for changes in conversationId router prop so we can update
// the active conversation
watch(
  () => props.conversationId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      if (!newId) {
        await messageStore.setActiveConversation(null)
      } else {
        isLoading.value = true
        await messageStore.setActiveConversationById(newId)
        isLoading.value = false
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  isLoading.value = true
  await messageStore.fetchConversations()
  if (props.conversationId) {
    await messageStore.setActiveConversationById(props.conversationId)
  }
  isLoading.value = false
})

onUnmounted(() => {
  // Clear active conversation when component is unmounted
  messageStore.setActiveConversation(null)
})

const handleSelectConvo = async (convo: ConversationSummary) => {
  if (messageStore.activeConversation?.conversationId === convo.conversationId) {
    return
  }
  isLoading.value = true
  router.push({ name: 'Messaging', params: { conversationId: convo.conversationId } })
  await messageStore.setActiveConversation(convo)
  isLoading.value = false
  setTimeout(async () => {
    await messageStore.markAsRead(convo.conversationId)
  }, 2000)
}

const handleDeselectConvo = async () => {
  router.back()
  await messageStore.setActiveConversation(null)
}

const handleProfileSelect = (profile: ProfileSummary) => {
  router.push({ name: 'PublicProfile', params: { id: profile.id } })
}
</script>

<template>
  <main class="d-flex flex-column h-100">
    <!-- <h1 class="px-3 mb-2" v-if="!detailVisible">{{  $t('messaging.page_title') }}</h1> -->
    <div class="flex-grow-1 d-flex flex-row overflow-hidden pt-5">
      <div class="col-12 col-md-4 d-md-block" :class="{ 'd-none': detailVisible }">
        <div class="mx-3">
          <ConversationSummaries
            :conversations="messageStore.conversations"
            :activeConversation="messageStore.activeConversation"
            @convo:select="handleSelectConvo"
          />
        </div>
      </div>
      <div class="col-md-8 flex-grow-1 d-flex flex-column overflow-hidden" v-if="detailVisible">
        <ConversationDetail
          :conversation="messageStore.activeConversation"
          @deselect:convo="handleDeselectConvo"
          @profile:select="handleProfileSelect"
        />
      </div>
    </div>
  </main>
</template>
<style scoped></style>
