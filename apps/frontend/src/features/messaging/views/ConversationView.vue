<script lang="ts" setup>
import { computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'

import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import ConversationDetail from '../components/ConversationDetail.vue'
import { useBootstrap } from '@/lib/bootstrap'
import { useMessageStore } from '../stores/messageStore'

defineOptions({ name: 'ConversationView' })

const props = defineProps<{
  conversationId: string
}>()

const router = useRouter()
const messageStore = useMessageStore()

provide(
  'viewerProfile',
  computed(() => useOwnerProfileStore().profile)
)

const activeConversation = computed(() => messageStore.activeConversation)
const isLoading = computed(() => messageStore.isLoading)

onMounted(async () => {
  await useBootstrap().bootstrap()
  if (!messageStore.conversations.length) {
    await messageStore.fetchConversations()
  }
  messageStore.suppressMessageNotifications = true
  await messageStore.setActiveConversationById(props.conversationId)
})

onUnmounted(() => {
  messageStore.suppressMessageNotifications = false
  messageStore.resetActiveConversation()
})

function handleDeselectConvo() {
  router.push({ name: 'Messaging' })
}

function handleProfileSelect(profileId: string) {
  router.push({ name: 'PublicProfile', params: { profileId } })
}

function handleUpdated() {
  messageStore.fetchConversations()
}
</script>

<template>
  <main class="conversation-view w-100 h-100">
    <MiddleColumn class="h-100">
      <ConversationDetail
        :loading="isLoading"
        :conversation="activeConversation"
        @deselect:convo="handleDeselectConvo"
        @profile:select="(profile) => handleProfileSelect(profile.id)"
        @updated="handleUpdated"
      />
    </MiddleColumn>
  </main>
</template>

<style scoped lang="scss">
.conversation-view {
  height: 100dvh;
}
</style>
