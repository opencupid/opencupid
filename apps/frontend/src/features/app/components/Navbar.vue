<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconHome from '@/assets/icons/interface/home.svg'
import IconUser from '@/assets/icons/interface/user.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'
import IconNote from '@/assets/icons/interface/message-2.svg'

import NotificationDot from '@/features/shared/ui/NotificationDot.vue'
import { useInteractionStore } from '@/features/interaction/stores/useInteractionStore'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

import ProfileImage from '@/features/images/components/ProfileImage.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const route = useRoute()
const authStore = useAuthStore()
const profileStore = useOwnerProfileStore()
const interactionStore = useInteractionStore()

const isBrowseActive = computed(
  () => route.path.startsWith('/browse') || route.path.startsWith('/profile/')
)

const hasUnreadMessages = computed(() => useMessageStore().hasUnreadMessages)
const hasMatchNotifications = computed(
  () => interactionStore.newMatchesCount > 0 || interactionStore.receivedLikesCount > 0
)
</script>

<template>
  <BNavbar
    v-if="authStore.isLoggedIn && profileStore.profile?.isOnboarded"
    class="navbar-soft"
    data-testid="navbar"
  >
    <MiddleColumn>
      <BNavbarNav class="d-flex justify-content-between w-100">
        <BNavItem
          to="/home"
          active-class="active"
          :aria-label="$t('nav.home')"
        >
          <IconHome class="svg-icon-lg" />
          <span class="d-none d-md-block label">{{ $t('nav.home') }}</span>
        </BNavItem>

        <BNavItem
          to="/posts"
          active-class="active"
          :aria-label="$t('nav.bulletin')"
        >
          <IconNote class="svg-icon-lg" />
          <span class="d-none d-md-inline label">{{ $t('nav.bulletin') }}</span>
        </BNavItem>

        <BNavItem
          to="/browse"
          active-class="active"
          :active="isBrowseActive"
          :aria-label="$t('nav.browse')"
        >
          <IconSearch class="svg-icon-lg" />
          <span class="d-none d-md-inline label">{{ $t('nav.browse') }}</span>
        </BNavItem>

        <BNavItem
          to="/matches"
          active-class="active"
          v-if="profileStore.profile?.isDatingActive"
          :aria-label="$t('nav.matches')"
        >
          <NotificationDot :show="hasMatchNotifications">
            <IconHeart class="svg-icon-lg" />
          </NotificationDot>
          <span class="d-none d-md-inline label">{{ $t('nav.matches') }}</span>
        </BNavItem>

        <BNavItem
          to="/inbox"
          active-class="active"
          :aria-label="$t('nav.inbox')"
        >
          <NotificationDot :show="hasUnreadMessages">
            <IconMessage class="svg-icon-lg" />
          </NotificationDot>
          <span class="d-none d-md-inline label">{{ $t('nav.inbox') }}</span>
        </BNavItem>

        <BNavItem
          to="/me"
          active-class="active"
          :aria-label="$t('nav.profile')"
        >
          <span
            v-if="profileStore.profile?.profileImages?.length"
            class="profile-thumbnail d-flex overflow-hidden"
          >
            <ProfileImage
              :profile="profileStore.profile"
              variant="thumb"
              class="img-fluid rounded w-100 h-100"
            />
          </span>
          <IconUser
            v-else
            class="svg-icon-lg"
          />
        </BNavItem>
      </BNavbarNav>
    </MiddleColumn>
  </BNavbar>
</template>

<style scoped lang="scss">
@import '@/css/app-vars.scss';

.navbar-soft {
  background-color: #dfd7ca; // Sandstone gray-300 — warm sand
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: var(--shadow-xs);
}

:deep(.nav-link) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--bs-dark);
  border-radius: var(--radius-md);
  transition:
    color 150ms ease,
    background-color 150ms ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.06);
  }

  &.active {
    color: var(--bs-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--bs-secondary);
    outline-offset: 2px;
  }
}
.nav-link .label {
  font-size: 0.85rem;
  margin-top: 0.25rem;
  color: inherit;
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
