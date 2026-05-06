<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useInboxRouteState } from '../composables/useInboxRouteState'

import MessagingView from './Messaging.vue'
import ConversationDetail from './ConversationDetail.vue'

defineOptions({ name: 'InboxPanel' })

const router = useRouter()
const { mode } = useInboxRouteState()

// ConversationDetail owns its own data via useConversationDetailViewModel —
// route → conversation resolution lives there, not here.

async function onConvoSelect(id: string) {
  router.push({ name: 'Conversation', params: { conversationId: id } })
}
</script>

<template>
  <MessagingView
    v-if="mode === 'list'"
    @convo:select="onConvoSelect"
  />
  <ConversationDetail v-else-if="mode === 'detail' || mode === 'draft'" />
</template>
