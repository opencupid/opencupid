<script setup lang="ts">
import { ref, computed, watch, provide, toRef } from 'vue'

import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useBootstrap } from '@/lib/bootstrap'

import OwnerDrawer from './OwnerDrawer.vue'
import MyProfileView from '@/features/myprofile/views/MyProfile.vue'
import SettingsView from '@/features/settings/views/Settings.vue'
import MessagingView from '@/features/messaging/views/Messaging.vue'
import PostList from '@/features/posts/components/PostList.vue'
import ConversationDetail from '@/features/messaging/components/ConversationDetail.vue'

defineOptions({ name: 'OwnerDrawerOrchestrator' })

const props = defineProps<{
  panel: 'profile' | 'inbox'
  conversationId?: string
}>()

const offcanvasState = useOffcanvasState()
const isOpen = computed(() => offcanvasState.isOpen('user'))

// ── Profile panel state ──────────────────────────────────────────────
const profileSubView = ref<'profile' | 'posts' | 'settings'>('profile')

const { formData } = useMyProfileViewModel(false)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

// ── Inbox panel state ────────────────────────────────────────────────
const inboxSubView = ref<'list' | 'thread'>('list')
const messageStore = useMessageStore()

// Reset sub-views when top-level panel changes
watch(
  () => props.panel,
  () => {
    profileSubView.value = 'profile'
    inboxSubView.value = 'list'
  }
)

// Lazy-initialize messaging on first open of inbox
let inboxInitialized = false
watch(
  () => props.panel === 'inbox' && isOpen.value,
  async (active) => {
    if (active && !inboxInitialized) {
      inboxInitialized = true
      await useBootstrap().bootstrap()
      messageStore.suppressMessageNotifications = true
      await messageStore.fetchConversations()
    }
    if (active && props.conversationId) {
      await messageStore.setActiveConversationById(props.conversationId)
      inboxSubView.value = 'thread'
    }
  }
)

async function onConvoSelect(conversationId: string) {
  await messageStore.setActiveConversationById(conversationId)
  inboxSubView.value = 'thread'
  setTimeout(() => messageStore.markAsRead(conversationId), 2000)
}

function onDeselectConvo() {
  messageStore.resetActiveConversation()
  inboxSubView.value = 'list'
}
</script>

<template>
  <OwnerDrawer>
    <template v-if="panel === 'profile'">
      <SettingsView
        v-if="profileSubView === 'settings'"
        @back="profileSubView = 'profile'"
        @close="offcanvasState.close()"
      />
      <template v-else>
        <MyProfileView
          v-if="profileSubView === 'profile'"
          @navigate:settings="profileSubView = 'settings'"
          @close="offcanvasState.close()"
        />
        <div
          v-else-if="profileSubView === 'posts'"
          class="d-flex flex-column h-100"
        >
          <div class="offcanvas-header">
            <span
              id="ownerDrawerLabel"
              class="offcanvas-title"
              >{{ $t('profile.tab_posts') }}</span
            >
            <button
              type="button"
              class="btn-close ms-auto"
              :aria-label="$t('common.close')"
              @click="offcanvasState.close()"
            />
          </div>
          <div class="offcanvas-body overflow-auto">
            <PostList scope="my" />
          </div>
        </div>

        <!-- Tab bar between profile and posts sub-views -->
        <div
          v-if="profileSubView === 'profile' || profileSubView === 'posts'"
          class="position-absolute bottom-0 start-0 end-0 border-top bg-body"
          style="z-index: 1"
        >
          <ul class="nav nav-tabs w-100 px-3">
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: profileSubView === 'profile' }"
                @click="profileSubView = 'profile'"
              >
                {{ $t('profile.tab_profile') }}
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: profileSubView === 'posts' }"
                @click="profileSubView = 'posts'"
              >
                {{ $t('profile.tab_posts') }}
              </button>
            </li>
          </ul>
        </div>
      </template>
    </template>

    <template v-else-if="panel === 'inbox'">
      <MessagingView
        v-if="inboxSubView === 'list'"
        @convo:select="onConvoSelect"
        @close="offcanvasState.close()"
      />
      <ConversationDetail
        v-else-if="inboxSubView === 'thread'"
        :loading="messageStore.isLoading"
        :conversation="messageStore.activeConversation"
        @deselect:convo="onDeselectConvo"
        @close="offcanvasState.close()"
      />
    </template>
  </OwnerDrawer>
</template>
