<script setup lang="ts">
import { ref, computed, watch, provide, toRef } from 'vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '@/store/userStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import { useNativeOffcanvas } from '@/features/shared/composables/useNativeOffcanvas'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { useMessagingViewModel } from '@/features/messaging/composables/useMessagingViewModel'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import { useMessageStore } from '@/features/messaging/stores/messageStore'

import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'
import EditableFields from '@/features/myprofile/components/EditableFields.vue'
import EditSaveButton from '@/features/shared/ui/EditSaveButton.vue'
import PostList from '@/features/posts/components/PostList.vue'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import LanguageSelectorDropdown from '@/features/shared/ui/LanguageSelectorDropdown.vue'
import OptInCheckboxes from '@/features/settings/components/OptInCheckboxes.vue'
import VersionInfo from '@/features/settings/components/VersionInfo.vue'
import PwaInstallButton from '@/features/app/components/PwaInstallButton.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'
import ReceivedLikesTeaser from '@/features/interaction/components/ReceivedLikesTeaser.vue'
import ConversationSummaries from '@/features/messaging/components/ConversationSummaries.vue'
import ConversationDetail from '@/features/messaging/components/ConversationDetail.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'
import IconBackward from '@/assets/icons/interface/backward.svg'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

defineOptions({ name: 'UserOffcanvas' })

const props = defineProps<{
  panel: 'profile' | 'inbox'
  conversationId?: string
}>()

const emit = defineEmits<{
  'profile:open': [profileId: string]
}>()

// ── Offcanvas open/close wired to shared state ──────────────────────────────
const offcanvasState = useOffcanvasState()
const offcanvasEl = ref<HTMLElement>()
const bsIsOpen = ref(false)

watch(
  () => offcanvasState.isOpen('user'),
  (val) => {
    bsIsOpen.value = val
  }
)
watch(bsIsOpen, (open) => {
  if (!open) offcanvasState.close()
})
useNativeOffcanvas(offcanvasEl, bsIsOpen)

// ── Internal sub-view state ─────────────────────────────────────────────────
const profileSubView = ref<'profile' | 'posts' | 'settings'>('profile')
const inboxSubView = ref<'list' | 'thread'>('list')

// Reset sub-views when the entry-point panel changes
watch(
  () => props.panel,
  () => {
    profileSubView.value = 'profile'
    inboxSubView.value = 'list'
  }
)

// ── Profile panel ────────────────────────────────────────────────────────────
const ownerProfileStore = useOwnerProfileStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const { viewState, formData, profilePreview, updateProfile } = useMyProfileViewModel(false)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

const optInModel = computed<ProfileOptInSettings>({
  get() {
    return ownerProfileStore.optInSettings
  },
  set(value) {
    ownerProfileStore.optInSettings = value
  },
})

// Lazy-fetch settings data only on first open of settings sub-view
let settingsFetched = false
watch(profileSubView, async (subView) => {
  if (subView === 'settings' && !settingsFetched) {
    settingsFetched = true
    await Promise.all([ownerProfileStore.fetchOptInSettings(), userStore.fetchUser()])
  }
})

function handleLogout() {
  authStore.logout()
  offcanvasState.close()
}

// ── Inbox panel ──────────────────────────────────────────────────────────────
const messageStore = useMessageStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()

const {
  conversations,
  activeConversation,
  isLoading: messagingLoading,
  haveConversations,
  isInitialized: messagingInitialized,
  handleMatchSelect,
  handleReceivedLikeSelect,
  handleMessageSent,
  initialize: initializeMessaging,
  fetchConversations,
  matches,
  haveMatches,
  showEmptyState,
  showMessageModal,
  messageProfile,
} = useMessagingViewModel()

// Lazy-initialize messaging on first open of inbox panel
let inboxInitialized = false
watch(
  () => props.panel === 'inbox' && bsIsOpen.value,
  async (active) => {
    if (active && !inboxInitialized) {
      inboxInitialized = true
      await initializeMessaging()
      await fetchConversations()
    }
    // If a conversationId was passed (deep-link), open the thread
    if (active && props.conversationId) {
      await messageStore.setActiveConversationById(props.conversationId)
      inboxSubView.value = 'thread'
    }
  }
)

async function onConvoSelect(convo: { conversationId: string }) {
  await messageStore.setActiveConversationById(convo.conversationId)
  inboxSubView.value = 'thread'
  setTimeout(() => messageStore.markAsRead(convo.conversationId), 2000)
}

function onDeselectConvo() {
  messageStore.resetActiveConversation()
  inboxSubView.value = 'list'
}

function onProfileSelectFromThread(profile: { id: string }) {
  offcanvasState.close()
  emit('profile:open', profile.id)
}

const inboxUnreadCount = computed(() =>
  hasUnreadMessages.value || hasMatchNotifications.value ? '\u25CF' : ''
)
</script>

<template>
  <div
    ref="offcanvasEl"
    class="offcanvas offcanvas-end user-offcanvas"
    tabindex="-1"
    aria-labelledby="userOffcanvasLabel"
  >
    <!-- ── Profile panel ─────────────────────────────────────────────────── -->
    <template v-if="panel === 'profile'">
      <!-- Header -->
      <div class="offcanvas-header">
        <template v-if="profileSubView === 'settings'">
          <button
            type="button"
            class="btn btn-link p-0 me-2"
            @click="profileSubView = 'profile'"
          >
            <IconBackward class="svg-icon" />
          </button>
          <span
            id="userOffcanvasLabel"
            class="offcanvas-title"
          >
            Settings
          </span>
        </template>
        <template v-else>
          <span class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
            <span
              v-if="ownerProfileStore.profile?.profileImages?.length"
              class="user-offcanvas-avatar flex-shrink-0 overflow-hidden rounded-circle"
            >
              <ProfileImage
                :profile="ownerProfileStore.profile"
                variant="thumb"
                class="img-fluid w-100 h-100"
              />
            </span>
            <span
              id="userOffcanvasLabel"
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
        <button
          type="button"
          class="btn-close ms-2"
          :aria-label="$t('common.close')"
          @click="offcanvasState.close()"
        />
      </div>

      <!-- Body: Settings sub-view -->
      <div
        v-if="profileSubView === 'settings'"
        class="offcanvas-body d-flex flex-column overflow-auto"
      >
        <fieldset class="d-flex align-items-center mb-3">
          <LanguageSelectorDropdown size="md" />
        </fieldset>
        <hr />
        <fieldset class="mb-3">
          <legend class="h6">{{ $t('settings.notifications_label') }}</legend>
          <OptInCheckboxes v-model="optInModel" />
        </fieldset>
        <fieldset class="mb-3">
          <PwaInstallButton />
        </fieldset>
        <hr />
        <fieldset class="d-flex flex-wrap align-items-center gap-2">
          <div
            class="flex-grow-1 form-hint"
            style="min-width: 0; word-break: break-all"
          >
            <span v-if="userStore.user?.email">{{ userStore.user.email }}</span>
            <span v-if="userStore.user?.phonenumber">{{ userStore.user.phonenumber }}</span>
          </div>
          <BButton
            variant="secondary"
            size="sm"
            @click="handleLogout"
          >
            <IconLogout class="svg-icon" />
            {{ $t('authentication.logout') }}
          </BButton>
        </fieldset>
        <div class="mt-auto pt-3">
          <VersionInfo />
        </div>
      </div>

      <!-- Body: Profile / Posts tabs -->
      <template v-else>
        <div class="offcanvas-header pt-0 pb-0">
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

        <div
          v-if="profileSubView === 'profile'"
          class="offcanvas-body overflow-auto position-relative"
        >
          <EditableFields
            v-model="formData"
            :edit-state="viewState.isEditable"
            @updated="updateProfile"
          >
            <ProfileContent
              v-if="profilePreview"
              :profile="profilePreview"
              class="shadow-lg"
            />
          </EditableFields>
          <!-- EditSaveButton pinned to offcanvas bottom -->
          <div class="position-sticky bottom-0 pb-2 text-end">
            <EditSaveButton v-model="viewState.isEditable" />
          </div>
        </div>

        <div
          v-else-if="profileSubView === 'posts'"
          class="offcanvas-body overflow-auto"
        >
          <PostList scope="my" />
        </div>
      </template>
    </template>

    <!-- ── Inbox panel ───────────────────────────────────────────────────── -->
    <template v-else-if="panel === 'inbox'">
      <!-- Header -->
      <div class="offcanvas-header">
        <template v-if="inboxSubView === 'thread'">
          <button
            type="button"
            class="btn btn-link p-0 me-2"
            @click="onDeselectConvo"
          >
            <IconBackward class="svg-icon" />
          </button>
          <span
            id="userOffcanvasLabel"
            class="offcanvas-title"
          >
            {{ activeConversation?.partnerProfile?.publicName }}
          </span>
        </template>
        <template v-else>
          <span
            id="userOffcanvasLabel"
            class="offcanvas-title"
          >
            {{ $t('messaging.inbox_title') }}
            <span
              v-if="inboxUnreadCount"
              class="badge bg-primary ms-1"
            >
              {{ inboxUnreadCount }}
            </span>
          </span>
        </template>
        <button
          type="button"
          class="btn-close ms-auto"
          :aria-label="$t('common.close')"
          @click="offcanvasState.close()"
        />
      </div>

      <!-- Body: conversation list -->
      <div
        v-if="inboxSubView === 'list'"
        class="offcanvas-body overflow-auto hide-scrollbar"
      >
        <template v-if="haveMatches">
          <p class="px-2 text-center">{{ $t('messaging.matches_list_title') }}</p>
          <div class="mb-3">
            <MatchesList
              :edges="matches"
              @select:profile="handleMatchSelect"
            />
          </div>
        </template>
        <div class="mb-3">
          <ReceivedLikesTeaser @interaction:selected="handleReceivedLikeSelect" />
        </div>
        <div v-if="haveConversations">
          <ConversationSummaries
            :loading="messagingLoading"
            :conversations="conversations"
            :active-conversation="activeConversation"
            @convo:select="onConvoSelect"
          />
        </div>
        <div
          v-else-if="messagingInitialized && showEmptyState"
          class="text-center text-muted py-4"
        >
          {{ $t('messaging.empty_state') }}
        </div>
      </div>

      <!-- Body: message thread -->
      <div
        v-else-if="inboxSubView === 'thread'"
        class="offcanvas-body p-0 d-flex flex-column overflow-hidden"
      >
        <ConversationDetail
          :loading="messagingLoading"
          :conversation="activeConversation"
          @deselect:convo="onDeselectConvo"
          @profile:select="onProfileSelectFromThread"
        />
      </div>

      <SendMessageDialog
        v-if="messageProfile"
        v-model="showMessageModal"
        :profile="messageProfile"
        @sent="handleMessageSent"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.user-offcanvas {
  width: 320px;

  @media (max-width: 575.98px) {
    width: 100vw;
  }
}

.user-offcanvas-avatar {
  width: 2rem;
  height: 2rem;
}
</style>
