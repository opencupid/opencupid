<script setup lang="ts">
import { ref, computed, watch, provide, toRef } from 'vue'

import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import { useBootstrap } from '@/lib/bootstrap'

import OwnerDrawer from './OwnerDrawer.vue'
import MyProfileView from '@/features/myprofile/views/MyProfile.vue'
import SettingsView from '@/features/settings/views/Settings.vue'
import MessagingView from '@/features/messaging/views/Messaging.vue'
import PostList from '@/features/posts/components/PostList.vue'
import ConversationDetail from '@/features/messaging/components/ConversationDetail.vue'

import IconBackward from '@/assets/icons/interface/backward.svg'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

defineOptions({ name: 'OwnerDrawerOrchestrator' })

const props = defineProps<{
  panel: 'profile' | 'inbox'
  conversationId?: string
}>()

const offcanvasState = useOffcanvasState()
const isOpen = computed(() => offcanvasState.isOpen('user'))

// ── Profile panel ────────────────────────────────────────────────────
const profileSubView = ref<'profile' | 'posts' | 'settings'>('profile')

const ownerProfileStore = useOwnerProfileStore()
const { formData } = useMyProfileViewModel(false)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

// ── Inbox panel ──────────────────────────────────────────────────────
const inboxSubView = ref<'list' | 'thread'>('list')
const messageStore = useMessageStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()

const inboxUnreadCount = computed(() =>
  hasUnreadMessages.value || hasMatchNotifications.value ? '\u25CF' : ''
)

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
    <!-- ── Header slot ──────────────────────────────────────────────── -->
    <template #header>
      <template v-if="panel === 'profile'">
        <template v-if="profileSubView === 'settings'">
          <button
            type="button"
            class="btn btn-link p-0 me-2"
            @click="profileSubView = 'profile'"
          >
            <IconBackward class="svg-icon" />
          </button>
          <span
            id="ownerDrawerLabel"
            class="offcanvas-title"
          >
            {{ $t('settings.title') }}
          </span>
        </template>
        <template v-else>
          <span class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
            <span
              v-if="ownerProfileStore.profile?.profileImages?.length"
              class="owner-drawer-avatar flex-shrink-0 overflow-hidden rounded-circle"
            >
              <ProfileImage
                :profile="ownerProfileStore.profile"
                variant="thumb"
                class="img-fluid w-100 h-100"
              />
            </span>
            <span
              id="ownerDrawerLabel"
              class="offcanvas-title text-truncate"
            >
              {{ ownerProfileStore.profile?.publicName }}
            </span>
          </span>
          <button
            type="button"
            class="btn btn-link p-0 ms-2 flex-shrink-0"
            :aria-label="$t('settings.title')"
            @click="profileSubView = 'settings'"
          >
            <IconSetting2 class="svg-icon" />
          </button>
        </template>
      </template>

      <template v-else-if="panel === 'inbox'">
        <template v-if="inboxSubView === 'thread'">
          <button
            type="button"
            class="btn btn-link p-0 me-2"
            @click="onDeselectConvo"
          >
            <IconBackward class="svg-icon" />
          </button>
          <span
            id="ownerDrawerLabel"
            class="offcanvas-title"
          >
            {{ messageStore.activeConversation?.partnerProfile?.publicName }}
          </span>
        </template>
        <template v-else>
          <span
            id="ownerDrawerLabel"
            class="offcanvas-title"
          >
            {{ $t('messaging.inbox_title') }}
            <span
              v-if="inboxUnreadCount"
              class="badge bg-primary ms-1"
              >{{ inboxUnreadCount }}</span
            >
          </span>
        </template>
      </template>
    </template>

    <!-- ── Body (default slot) ──────────────────────────────────────── -->
    <template v-if="panel === 'profile'">
      <SettingsView v-if="profileSubView === 'settings'" />
      <template v-else>
        <div class="px-3 pt-2 border-bottom flex-shrink-0">
          <ul class="nav nav-tabs w-100">
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
        <div class="flex-grow-1 overflow-auto">
          <MyProfileView v-if="profileSubView === 'profile'" />
          <PostList
            v-else-if="profileSubView === 'posts'"
            scope="my"
          />
        </div>
      </template>
    </template>

    <template v-else-if="panel === 'inbox'">
      <MessagingView
        v-if="inboxSubView === 'list'"
        @convo:select="onConvoSelect"
      />
      <ConversationDetail
        v-else-if="inboxSubView === 'thread'"
        :loading="messageStore.isLoading"
        :conversation="messageStore.activeConversation"
        @deselect:convo="onDeselectConvo"
      />
    </template>
  </OwnerDrawer>
</template>

<style scoped>
.owner-drawer-avatar {
  width: 2rem;
  height: 2rem;
}
</style>
