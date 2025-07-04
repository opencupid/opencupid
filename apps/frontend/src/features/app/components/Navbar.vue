<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconHome from '@/assets/icons/interface/home.svg'
import IconUser from '@/assets/icons/interface/user.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'

import NotificationDot from '@/features/shared/ui/NotificationDot.vue'
import { useInteractionStore } from '@/features/interaction/stores/useInteractionStore'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

import ProfileImage from '@/features/images/components/ProfileImage.vue'

const authStore = useAuthStore()
const profileStore = useOwnerProfileStore()
const interactionStore = useInteractionStore()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const isProfileLoaded = computed(() => profileStore.profile !== null && !profileStore.isLoading)
const hasUnreadMessages = computed(() => useMessageStore().hasUnreadMessages)
const hasMatchNotifications = computed(
  () => interactionStore.matches.length > 0 || interactionStore.receivedLikesCount > 0
)

function handleLogoutClick() {
  authStore.logout() // Clear the authentication state
  useRouter().push({ name: 'Login' }) // Redirect to the login page
}
</script>

<template>
  <BNavbar variant="secondary" fixed="top" class="" data-testid="navbar">
    <BNavbarNav class="d-flex justify-content-between w-100">
      <BNavItem to="/" active-class="active">
        <IconHome class="svg-icon-lg" />
        <span class="d-none d-md-inline label">{{ $t('nav.home') }}</span>
      </BNavItem>

      <BNavItem to="/browse" active-class="active">
        <IconSearch class="svg-icon-lg" />
        <span class="d-none d-md-inline label">{{ $t('nav.browse') }}</span>
      </BNavItem>

      <BNavItem to="/matches" active-class="active" v-if="profileStore.profile?.isDatingActive">
        <NotificationDot :show="hasMatchNotifications">
          <IconHeart class="svg-icon-lg" />
        </NotificationDot>
        <span class="d-none d-md-inline label">{{ $t('nav.matches') }}</span>
      </BNavItem>

      <BNavItem to="/inbox" active-class="active">
        <NotificationDot :show="hasUnreadMessages">
          <IconMessage class="svg-icon-lg" />
        </NotificationDot>
        <span class="d-none d-md-inline label">{{ $t('nav.inbox') }}</span>
      </BNavItem>

      <BNavItem to="/me" active-class="active">
        <span
          v-if="profileStore.profile?.profileImages?.length"
          class="profile-thumbnail d-flex"
        >
          <ProfileImage
            :profile="profileStore.profile"
            class="img-fluid rounded"
            style="width: 2.5rem; height: 2.5rem"
          />
        </span>
        <IconUser v-else class="svg-icon-lg" />
      </BNavItem>

    </BNavbarNav>
  </BNavbar>
</template>

<style scoped lang="scss">
@import '@/css/app-vars.scss';

:deep(.nav-link .label) {
  vertical-align: sub;
  margin-left: 0.25rem;
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(button) {
  margin: 0 !important;
  padding: 0;
  display: flex;
}
:deep(button:after) {
  content: none !important;
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.navbar {
  height: $navbar-height;
}
</style>
