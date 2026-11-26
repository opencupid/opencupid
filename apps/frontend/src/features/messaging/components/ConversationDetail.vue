<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import ProfileContentPanel from '@/features/publicprofile/components/ProfileContentPanel.vue'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import { useConversationDetailViewModel } from '../composables/useConversationDetailViewModel'
import BlockProfileDialog from '@/features/publicprofile/components/BlockProfileDialog.vue'

import SendMessage from './SendMessageForm.vue'
import MessageList from './MessageList.vue'
import MessagingNav from './MessagingNav.vue'
import ConversationLoadError from './ConversationLoadError.vue'

defineOptions({ name: 'ConversationDetail' })

const router = useRouter()
const messageStore = useMessageStore()
const panel = useDetailPanel()

const vm = useConversationDetailViewModel()

const showModal = ref(false)

function onProfileSelect() {
  if (vm.partner.value) {
    panel.show(ProfileContentPanel, { profile: vm.partner.value })
  }
}

async function handleBlockProfile() {
  const ok = await vm.blockProfile()
  showModal.value = false
  if (ok) vm.deselect()
}
</script>

<template>
  <div class="convo-detail shadow-lg h-100 position-relative d-flex flex-column">
    <ConversationLoadError
      v-if="vm.loadError.value"
      :reason="vm.loadError.value"
      @back="vm.deselect"
      @close="router.replace({ name: 'Browse' })"
    />
    <template v-else>
      <MessagingNav
        class="messaging-nav w-100"
        v-if="vm.partner.value"
        :recipient="vm.partner.value"
        :allowCalls="vm.myIsCallable.value"
        :callableDisabled="vm.isDraft.value"
        @deselect:convo="vm.deselect"
        @close="router.replace({ name: 'Browse' })"
        @profile:select="onProfileSelect"
        @block:open="showModal = true"
        @callable:toggle="vm.toggleCallable"
      />

      <div class="flex-grow-1 overflow-hidden d-flex flex-column">
        <MessageList
          :messages="messageStore.messages"
          :has-more="messageStore.hasMoreMessages"
          :is-loading-more="messageStore.isLoadingMoreMessages"
          :editable-message-id="messageStore.editableMessage?.id"
          @load-older="messageStore.fetchOlderMessages"
          @edit="messageStore.startEditing"
        />
      </div>

      <div class="send-message-wrapper d-flex flex-column align-items-center w-100 py-3 px-2">
        <SendMessage
          v-if="vm.partner.value && vm.conversation.value"
          :recipientProfile="vm.partner.value"
          :conversationId="vm.persistedConversation.value?.conversationId ?? null"
          :canCall="vm.canCall.value"
          :canReply="vm.conversation.value.canReply"
          @message:sent="vm.onMessageSent"
          @call:start="vm.startCall"
        />
      </div>

      <BlockProfileDialog
        v-if="vm.partner.value"
        :profile="vm.partner.value"
        v-model="showModal"
        :loading="vm.profileStoreLoading.value"
        @block="handleBlockProfile"
      />
    </template>
  </div>
</template>

<style scoped>
.send-message-wrapper {
  background-color: transparent;
}
</style>
