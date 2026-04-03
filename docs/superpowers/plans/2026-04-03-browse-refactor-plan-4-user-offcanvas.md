# Browse Refactor — Plan 4: User Offcanvas + Routing Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-house My Profile, Settings, and Inbox into a `UserOffcanvas.vue` shell accessible from map overlay controls. Remove the navbar. Retire full-page routes for `/me`, `/settings`, `/inbox`, `/posts`, `/home` and replace them with redirects to `/browse?panel=...`.

**Architecture:** New `UserOffcanvas.vue` shell composes `useMyProfileViewModel`, `useMessagingViewModel`, and settings data directly — no route wrappers, no cold-start bootstrap calls. Open/close is driven by the shared `useOffcanvasState` composable (from Plan 3). `BrowseProfiles.vue` gains two overlay control buttons (avatar + inbox) and reads `?panel=` query params on mount to support deep-link redirects. Removing `<Navbar />` from `App.vue` is sufficient to eliminate all navbar offsets (the `nav.navbar + main` CSS sibling rule handles padding automatically).

**Tech Stack:** Vue 3, Bootstrap offcanvas (`useNativeOffcanvas`), Pinia, `useMessagingViewModel`, `useMyProfileViewModel`.

**Prerequisite:** Plan 3 (Posts Sidebar + Browse Offcanvas) must be complete — `useOffcanvasState` composable must exist at `apps/frontend/src/features/shared/composables/useOffcanvasState.ts`.

**Spec reference:** `docs/superpowers/specs/2026-04-03-browse-gui-refactor-design.md` §§ 5, 6, 7

---

## File Map

| Action | Path |
| ------ | ---- |
| Create | `apps/frontend/src/features/app/components/UserOffcanvas.vue` |
| Create | `apps/frontend/src/features/app/components/__tests__/UserOffcanvas.test.ts` |
| Modify | `apps/frontend/src/features/browse/views/BrowseProfiles.vue` — add UserOffcanvas + overlay controls |
| Modify | `apps/frontend/src/App.vue` — remove Navbar, update KeepAlive |
| Modify | `apps/frontend/src/router/index.ts` — retire routes, add redirects |
| Modify | `apps/frontend/src/features/shared/components/BrowseLayout.vue` — `100vh` height |
| Modify | `apps/frontend/src/features/browse/components/ProfileBrowseLayout.vue` — `100vh` height |

---

### Task 1: Create `UserOffcanvas.vue` — shell with Profile + Inbox panels

**Files:**

- Create: `apps/frontend/src/features/app/components/UserOffcanvas.vue`

- [ ] **Step 1: Write the component**

```vue
<!-- apps/frontend/src/features/app/components/UserOffcanvas.vue -->
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
import IconChevronLeft from '@/assets/icons/interface/chevron-left.svg'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'
import { computed as vComputed } from 'vue'

const props = defineProps<{
  panel: 'profile' | 'inbox'
  conversationId?: string
}>()

const emit = defineEmits<{
  (e: 'profile:open', profileId: string): void
}>()

// ── Offcanvas open/close wired to shared state ──────────────────────────────
const offcanvasState = useOffcanvasState()
const offcanvasEl = ref<HTMLElement>()
const bsIsOpen = ref(false)

watch(() => offcanvasState.isOpen('user'), (val) => { bsIsOpen.value = val })
watch(bsIsOpen, (open) => { if (!open) offcanvasState.close() })
useNativeOffcanvas(offcanvasEl, bsIsOpen)

// ── Internal sub-view state ─────────────────────────────────────────────────
const profileSubView = ref<'profile' | 'posts' | 'settings'>('profile')
const inboxSubView = ref<'list' | 'thread'>('list')

// Reset sub-views when the entry-point panel changes
watch(() => props.panel, () => {
  profileSubView.value = 'profile'
  inboxSubView.value = 'list'
})

// ── Profile panel ────────────────────────────────────────────────────────────
const ownerProfileStore = useOwnerProfileStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const {
  viewState,
  formData,
  profilePreview,
  updateProfile,
} = useMyProfileViewModel(false)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

const optInModel = vComputed<ProfileOptInSettings>({
  get() { return ownerProfileStore.optInSettings },
  set(value) { ownerProfileStore.optInSettings = value },
})

// Lazy-fetch settings data only on first open of settings sub-view
let settingsFetched = false
watch(profileSubView, async (subView) => {
  if (subView === 'settings' && !settingsFetched) {
    settingsFetched = true
    await Promise.all([
      ownerProfileStore.fetchOptInSettings(),
      userStore.fetchUser(),
    ])
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
  handleSelectConvo,
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

function onConvoSelect(convo: { id: string }) {
  handleSelectConvo(convo)
  inboxSubView.value = 'thread'
}

function onDeselectConvo() {
  messageStore.resetActiveConversation()
  inboxSubView.value = 'list'
}

function onProfileSelectFromThread(profile: { id: string }) {
  offcanvasState.close()
  emit('profile:open', profile.id)
}

const inboxUnreadCount = vComputed(() =>
  (hasUnreadMessages.value || hasMatchNotifications.value) ? '●' : ''
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
            <IconChevronLeft class="svg-icon" />
          </button>
          <span
            id="userOffcanvasLabel"
            class="offcanvas-title"
          >Settings</span>
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
            >{{ ownerProfileStore.profile?.publicName }}</span>
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
          :data-bs-dismiss="undefined"
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
            :editState="viewState.isEditable"
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
            <IconChevronLeft class="svg-icon" />
          </button>
          <span
            id="userOffcanvasLabel"
            class="offcanvas-title"
          >{{ activeConversation?.partnerProfile?.publicName }}</span>
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
            >{{ inboxUnreadCount }}</span>
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
            :activeConversation="activeConversation"
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
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no new errors. Fix any import path issues (e.g. check `useNotificationState` path).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/app/components/UserOffcanvas.vue
git commit -m "feat: add UserOffcanvas shell with Profile + Inbox panels"
```

---

### Task 2: Write UserOffcanvas tests (failing first)

**Files:**

- Create: `apps/frontend/src/features/app/components/__tests__/UserOffcanvas.test.ts`

Look at `apps/frontend/src/features/browse/views/__tests__/` for the component mounting pattern used in this codebase.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/frontend/src/features/app/components/__tests__/UserOffcanvas.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UserOffcanvas from '../UserOffcanvas.vue'

// Suppress Bootstrap offcanvas JS (no DOM in jsdom)
vi.mock('@/features/shared/composables/useNativeOffcanvas', () => ({
  useNativeOffcanvas: vi.fn(),
}))

const mockOpen = vi.fn()
const mockClose = vi.fn()
const mockIsOpen = vi.fn(() => false)

vi.mock('@/features/shared/composables/useOffcanvasState', () => ({
  useOffcanvasState: () => ({ open: mockOpen, close: mockClose, isOpen: mockIsOpen }),
}))

vi.mock('@/features/myprofile/composables/useMyProfileViewModel', () => ({
  useMyProfileViewModel: () => ({
    viewState: { isEditable: false },
    formData: { publicName: 'Test User' },
    profilePreview: null,
    updateProfile: vi.fn(),
  }),
}))

vi.mock('@/features/messaging/composables/useMessagingViewModel', () => ({
  useMessagingViewModel: () => ({
    conversations: [],
    activeConversation: null,
    isLoading: false,
    haveConversations: false,
    isInitialized: false,
    handleSelectConvo: vi.fn(),
    handleMatchSelect: vi.fn(),
    handleReceivedLikeSelect: vi.fn(),
    handleMessageSent: vi.fn(),
    initialize: vi.fn(),
    fetchConversations: vi.fn(),
    matches: [],
    haveMatches: false,
    showEmptyState: true,
    showMessageModal: false,
    messageProfile: null,
  }),
}))

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    profile: { publicName: 'Test User', profileImages: [] },
    optInSettings: {},
    fetchOptInSettings: vi.fn(),
    fetchOwnerProfile: vi.fn(),
  }),
}))

vi.mock('@/features/app/composables/useNotificationState', () => ({
  useNotificationState: () => ({ hasUnreadMessages: false, hasMatchNotifications: false }),
}))

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({
    resetActiveConversation: vi.fn(),
    setActiveConversationById: vi.fn(),
  }),
}))

const globalConfig = {
  stubs: {
    ProfileContent: true,
    EditableFields: { template: '<div><slot /></div>' },
    EditSaveButton: true,
    PostList: true,
    ProfileImage: true,
    LanguageSelectorDropdown: true,
    OptInCheckboxes: true,
    VersionInfo: true,
    PwaInstallButton: true,
    MatchesList: true,
    ReceivedLikesTeaser: true,
    ConversationSummaries: true,
    ConversationDetail: true,
    SendMessageDialog: true,
    BButton: true,
    IconSetting2: true,
    IconLogout: true,
    IconChevronLeft: true,
  },
  mocks: { $t: (k: string) => k },
}

describe('UserOffcanvas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows profile panel when panel=profile', () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('gear icon switches to settings sub-view', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('back button from settings returns to profile tab', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    await wrapper.findAll('button')[0].trigger('click') // back button (first button in header)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('shows inbox panel when panel=inbox', () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('messaging.inbox_title')
  })

  it('clicking close calls offcanvasState.close', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('.btn-close').trigger('click')
    expect(mockClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm --filter frontend exec vitest run src/features/app/components/__tests__/UserOffcanvas.test.ts
```

Expected: FAIL — component not found or import errors.

- [ ] **Step 3: Run to confirm pass after Task 1**

```bash
pnpm --filter frontend exec vitest run src/features/app/components/__tests__/UserOffcanvas.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/app/components/__tests__/UserOffcanvas.test.ts
git commit -m "test: add UserOffcanvas unit tests"
```

---

### Task 3: Wire UserOffcanvas into `BrowseProfiles.vue`

**Files:**

- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

- [ ] **Step 1: Add imports and state**

At the top of the `<script setup>` block, add:

```ts
import { useRoute } from 'vue-router'
import UserOffcanvas from '@/features/app/components/UserOffcanvas.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import NotificationDot from '@/features/shared/ui/NotificationDot.vue'

const route = useRoute()
const ownerProfileStore = useOwnerProfileStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()

const userOffcanvasPanel = ref<'profile' | 'inbox'>('profile')
const initialConversationId = ref<string | undefined>()

function openUserOffcanvas(panel: 'profile' | 'inbox', conversationId?: string) {
  userOffcanvasPanel.value = panel
  initialConversationId.value = conversationId
  offcanvasState.open('user')
}
```

(Note: `offcanvasState` is already imported in `BrowseProfiles.vue` from Plan 3.)

- [ ] **Step 2: Add deep-link support in `onMounted`**

Inside the existing `onMounted` block (or add one if not present), append:

```ts
const panel = route.query.panel as 'profile' | 'inbox' | undefined
const convoId = route.query.conversation as string | undefined
if (panel === 'profile' || panel === 'inbox') {
  openUserOffcanvas(panel, convoId)
}
```

- [ ] **Step 3: Add overlay controls to template**

Inside the map container `<div>` (the element that wraps `<MapView>`), add overlay buttons as absolute-positioned siblings:

```html
<!-- Map overlay: user controls (top-right) -->
<div class="map-overlay-controls position-absolute top-0 end-0 p-2 d-flex gap-2" style="z-index: 1010;">
  <button
    type="button"
    class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
    style="width: 2.5rem; height: 2.5rem;"
    :aria-label="$t('nav.inbox')"
    @click="openUserOffcanvas('inbox')"
  >
    <NotificationDot :show="hasUnreadMessages || hasMatchNotifications">
      <IconMessage class="svg-icon" />
    </NotificationDot>
  </button>
  <button
    type="button"
    class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
    style="width: 2.5rem; height: 2.5rem;"
    :aria-label="$t('nav.profile')"
    @click="openUserOffcanvas('profile')"
  >
    <ProfileImage
      v-if="ownerProfileStore.profile?.profileImages?.length"
      :profile="ownerProfileStore.profile"
      variant="thumb"
      class="img-fluid w-100 h-100"
    />
    <IconUser
      v-else
      class="svg-icon"
    />
  </button>
</div>

<!-- User offcanvas (Profile + Inbox panels) -->
<UserOffcanvas
  :panel="userOffcanvasPanel"
  :conversationId="initialConversationId"
  @profile:open="(profileId) => {
    selectedProfileId = profileId
    offcanvasState.open('browse')
  }"
/>
```

(Note: `selectedProfileId` and `offcanvasState.open('browse')` are from Plan 3's BrowseOffcanvas wiring. Adapt to match the actual variable names established in Plan 3.)

- [ ] **Step 4: Type-check**

```bash
pnpm type-check
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat: add UserOffcanvas overlay controls to BrowseProfiles"
```

---

### Task 4: Navbar removal + layout height fix

**Files:**

- Modify: `apps/frontend/src/App.vue`
- Modify: `apps/frontend/src/features/shared/components/BrowseLayout.vue`
- Modify: `apps/frontend/src/features/browse/components/ProfileBrowseLayout.vue`

- [ ] **Step 1: Remove Navbar from App.vue**

In `apps/frontend/src/App.vue`:

Remove the `import Navbar` line and `<Navbar />` from the template. Also remove `BrowsePosts` from the `KeepAlive :include` array (the route is being retired in Task 5):

```html
<!-- was: -->
<KeepAlive :include="['UserHome', 'BrowseProfiles', 'BrowsePosts']">
<!-- becomes: -->
<KeepAlive :include="['BrowseProfiles']">
```

- [ ] **Step 2: Fix BrowseLayout height**

In `apps/frontend/src/features/shared/components/BrowseLayout.vue`, change:

```scss
// was:
.list-view {
  height: calc(100vh - $navbar-height);
}
// becomes:
.list-view {
  height: 100vh;
}
```

Remove the `@import '@/css/app-vars.scss'` line if `$navbar-height` was the only variable used.

- [ ] **Step 3: Fix ProfileBrowseLayout height**

In `apps/frontend/src/features/browse/components/ProfileBrowseLayout.vue`, same change:

```scss
// was:
.list-view {
  height: calc(100vh - $navbar-height);
}
// becomes:
.list-view {
  height: 100vh;
}
```

Remove the `@import '@/css/app-vars.scss'` import if no longer needed.

- [ ] **Step 4: Run Navbar tests**

```bash
pnpm --filter frontend exec vitest run src/features/app/components/__tests__/Navbar.spec.ts
```

If the Navbar spec mounts `App.vue` and checks for `<nav>`, update it to reflect that the navbar is gone. If the test only unit-tests the `Navbar` component itself, it can remain as-is (the component file is retained, just not mounted in `App.vue`).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.vue \
        apps/frontend/src/features/shared/components/BrowseLayout.vue \
        apps/frontend/src/features/browse/components/ProfileBrowseLayout.vue
git commit -m "feat: remove navbar, fix layout heights to 100vh"
```

---

### Task 5: Routing cleanup

**Files:**

- Modify: `apps/frontend/src/router/index.ts`

- [ ] **Step 1: Remove retired route definitions and their imports**

Remove the following import lines:

```ts
import MessagingView from '@/features/messaging/views/Messaging.vue'
import ConversationView from '@/features/messaging/views/ConversationView.vue'
import UserHome from '@/features/userhome/views/UserHome.vue'
import Settings from '@/features/settings/views/Settings.vue'
import MyProfile from '@/features/myprofile/views/MyProfile.vue'
import BrowsePostsView from '@/features/posts/views/BrowsePosts.vue'
```

Remove these route objects from the `routes` array:

```ts
{ path: '/me', name: 'MyProfile', ... }
{ path: '/me/edit', name: 'EditProfile', ... }
{ path: '/home', name: 'UserHome', ... }
{ path: '/settings', name: 'Settings', ... }
{ path: '/inbox', name: 'Messaging', ... }
{ path: '/inbox/:conversationId', name: 'Conversation', ... }
{ path: '/posts', name: 'Posts', ... }
```

- [ ] **Step 2: Add redirect routes**

Add these redirect entries to the `routes` array (before the root `/` redirect):

```ts
{ path: '/me', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
{ path: '/me/edit', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
{ path: '/settings', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
{ path: '/inbox', redirect: () => ({ path: '/browse', query: { panel: 'inbox' } }) },
{
  path: '/inbox/:conversationId',
  redirect: (to) => ({
    path: '/browse',
    query: { panel: 'inbox', conversation: to.params.conversationId as string },
  }),
},
{ path: '/posts', redirect: '/browse' },
{ path: '/home', redirect: '/browse' },
```

- [ ] **Step 3: Update root redirect and nav guard**

Change the root redirect:

```ts
// was:
{ path: '/', redirect: { name: 'UserHome' } },
// becomes:
{ path: '/', redirect: '/browse' },
```

Update the logged-in user redirect in the `beforeEach` guard:

```ts
// was:
if (!to.meta.requiresAuth && authStore.isLoggedIn) {
  return { name: 'UserHome' }
}
// becomes:
if (!to.meta.requiresAuth && authStore.isLoggedIn) {
  return { path: '/browse' }
}
```

- [ ] **Step 4: Run full frontend test suite**

```bash
pnpm --filter frontend test
```

Fix any test that references the removed route names (`UserHome`, `MyProfile`, `Settings`, `Messaging`, `Conversation`, `Posts`).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/router/index.ts
git commit -m "feat: retire full-page routes, add /browse redirects"
```

---

### Task 6: Full test suite + type-check

- [ ] **Step 1: Run full test suite**

```bash
pnpm --filter frontend test
pnpm type-check
```

Expected: all passing. Fix any regressions — common issues:

- Tests that `router.push({ name: 'UserHome' })` → update to `router.push('/browse')`
- Tests that render `<Navbar />` in App.vue → update expectations
- Tests that check for `$navbar-height` in computed styles → update to `100vh`

- [ ] **Step 2: Commit**

```bash
git add -p   # stage any test fixes
git commit -m "fix: update tests for routing and navbar removal"
```

---

### Task 7: Post-UAT component rename audit

> **This task is deferred until after UAT passes.** Do not execute it during the initial implementation sprint — all renames are mechanical and generate large diffs that interfere with code review of the functional changes.

After UAT, rename the following files and all their import sites to align names with actual responsibilities:

| Old name | Reason stale | Action |
| -------- | ------------ | ------ |
| `BrowseProfiles.vue` | Now owns profiles + posts + sidebar + both offcanvas types | Rename → `BrowseView.vue` |
| `ProfileBrowseLayout.vue` | Layout shell for the unified view, not profile-specific | Rename → `BrowseLayout.vue` (delete old `BrowseLayout.vue`) |
| `BrowseLayout.vue` | Superseded by `ProfileBrowseLayout` | Delete after merging |
| `BrowsePosts.vue` | Route retired; file is dead code | Remove |
| `PostFilterBar.vue` | Retired in Plan 2 (merged into unified filter) | Remove |
| `useSocialMatchViewModel` | Now drives unified map (profiles + posts) | Rename → `useBrowseViewModel` |
| `usePostsViewModel` | Folded into unified view model in Plan 2 | Remove or fold |
| `MyProfileSecondaryNav.vue` | Retired in Plan 4 (replaced by offcanvas tab bar) | Remove |

For each rename:

1. `grep -r "<OldName>\|useOldName" apps/frontend/src/` to find all import sites
2. Update the component `name` option, filename, all imports, router references, `KeepAlive :include`
3. Run `pnpm lint && pnpm type-check`
4. Commit: `refactor: rename <OldName> → <NewName>`

---

## Verification

```bash
# UserOffcanvas unit tests
pnpm --filter frontend exec vitest run src/features/app/components/__tests__/UserOffcanvas.test.ts

# Full suite
pnpm --filter frontend test
pnpm type-check
```

Manual smoke test:

1. Navigate to `https://localhost:5173/browse` — map fills full viewport, no navbar
2. Click avatar button (top-right overlay) → Profile panel opens; Profile/Posts tabs work; gear → Settings sub-view; back returns to Profile tab; `EditSaveButton` appears when editing
3. Click inbox button → Inbox panel opens; conversation list loads; click a conversation → thread view; back returns to list
4. Navigate to `/me` → auto-redirects to `/browse?panel=profile` → Profile panel auto-opens
5. Navigate to `/inbox/some-id` → auto-redirects → Inbox panel auto-opens on that conversation thread
6. Open BrowseOffcanvas (click a profile marker) → UserOffcanvas closes automatically (mutual exclusion via `useOffcanvasState`)
7. Open UserOffcanvas → BrowseOffcanvas closes automatically
