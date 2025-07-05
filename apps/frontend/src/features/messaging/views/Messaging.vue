<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'

import ConversationDetail from '../components/ConversationDetail.vue'
import { useMessageStore } from '../stores/messageStore'
import ConversationSummaries from '../components/ConversationSummaries.vue'
import ViewTitle from '../../shared/ui/ViewTitle.vue'

const router = useRouter()
const messageStore = useMessageStore()

const props = defineProps<{
  conversationId?: string
}>()

// Watch for changes in conversationId router prop so we can update
// the active conversation
watch(
  () => props.conversationId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      if (!newId) {
        await messageStore.setActiveConversation(null)
      } else {
        await messageStore.setActiveConversationById(newId)
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await messageStore.fetchConversations()
  if (props.conversationId) {
    await messageStore.setActiveConversationById(props.conversationId)
  }
})

onUnmounted(() => {
  // Clear active conversation when component is unmounted
  messageStore.setActiveConversation(null)
})

const handleSelectConvo = async (convo: ConversationSummary) => {
  if (messageStore.activeConversation?.conversationId === convo.conversationId) {
    return
  }
  router.push({ name: 'Messaging', params: { conversationId: convo.conversationId } })
  await messageStore.setActiveConversation(convo)
  setTimeout(async () => {
    await messageStore.markAsRead(convo.conversationId)
  }, 2000)
}

const handleDeselectConvo = async () => {
  router.back()
  messageStore.resetActiveConversation()
}

const handleProfileSelect = (profile: ProfileSummary) => {
  router.push({ name: 'PublicProfile', params: { profileId: profile.id } })
}

const haveConversations = computed(() => {
  return messageStore.conversations.length > 0
})

const isDetailView = computed(() => !!messageStore.activeConversation)
</script>

<template>
  <main class="w-100 position-relative">
    <!-- Detail view overlay -->
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100"
      style="z-index: 1050"
    >
      <MiddleColumn class="h-100">
        <ConversationDetail
          :loading="messageStore.isLoading"
          :conversation="messageStore.activeConversation"
          @deselect:convo="handleDeselectConvo"
          @profile:select="handleProfileSelect"
          @updated="messageStore.fetchConversations"
        />
      </MiddleColumn>
    </div>

    <!-- List view -->
    <div class="d-flex flex-column overflow-auto h-100" :class="{ 'd-none': isDetailView }">
      <ViewTitle :icon="IconMessage" title="Messages" class="text-primary" />
      <BOverlay
        :show="!haveConversations"
        no-spinner
        bg-color="inherit"
        :blur="null"
        opacity="0.85"
        class="h-100 overlay"
      >
        <template #overlay>
          <div class="d-flex flex-column align-items-center justify-content-center h-100">
            <p class="text-muted mb-4 mt-4 text-center">Your conversations will take place here.</p>
            <BButton
              variant="primary"
              size="lg"
              pill
              @click="router.push({ name: 'BrowseProfiles' })"
            >
              <IconSearch class="svg-icon" />
              Find people to talk to
            </BButton>
          </div>
        </template>

        <!-- Conversation summaries -->
        <div class="flex-grow-1 overflow-auto pt-5">
          <MiddleColumn>
            <ConversationSummaries
              :loading="messageStore.isLoading"
              :conversations="messageStore.conversations"
              :activeConversation="messageStore.activeConversation"
              @convo:select="handleSelectConvo"
            />
          </MiddleColumn>
        </div>
      </BOverlay>
    </div>
  </main>
</template>
<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.detail-view {
  left: 0;
  // nav.fixed is on 1030 - on screens < md we put this above the navbar

  // on screens > sm navbar stays visible
  top: $navbar-height;
  height: calc(100vh - $navbar-height);
  z-index: 900;
}

.inactive {
  pointer-events: none;
  visibility: hidden;
  display: none;
}
main {
  width: 100%;
  // height: 100vh;
}
</style>
