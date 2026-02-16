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

const hasUnreadMessages = computed(() => useMessageStore().hasUnreadMessages)
const hasMatchNotifications = computed(
  () => interactionStore.newMatchesCount > 0 || interactionStore.receivedLikesCount > 0
)

// Use Vue Router's route matching for Browse nav item
// Checks if current route is any of the browse-related routes
const isBrowseActive = computed(() => {
  const routeName = route.name
  return routeName === 'BrowseProfiles' || 
         routeName === 'BrowseProfilesScope' || 
         routeName === 'PublicProfile'
})
</script>

<template>
  <BNavbar
    v-if="authStore.isLoggedIn && profileStore.profile?.isOnboarded"
    class="bg-dark"
    data-testid="navbar"
  >
    <MiddleColumn>
      <BNavbarNav class="d-flex justify-content-between w-100">
        <BNavItem to="/home" active-class="active">
          <IconHome class="svg-icon-lg" />
          <span class="d-none d-md-block label">{{ $t('nav.home') }}</span>
        </BNavItem>

        <BNavItem to="/posts" active-class="active">
          <IconNote class="svg-icon-lg" />
          <span class="d-none d-md-inline label">{{ $t('nav.bulletin') }}</span>
        </BNavItem>
        
        <BNavItem to="/browse" :active="isBrowseActive" active-class="active">
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
            class="profile-thumbnail d-flex overflow-hidden"
          >
            <ProfileImage
              :profile="profileStore.profile"
              variant="thumb"
              class="img-fluid rounded w-100 h-100"
            />
          </span>
          <IconUser v-else class="svg-icon-lg" />
        </BNavItem>
      </BNavbarNav>
    </MiddleColumn>
  </BNavbar>
</template>

<style scoped lang="scss">
@import '@/css/app-vars.scss';
:deep(.nav-link) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--bs-light);
  &.active {
    color: var(--bs-secondary);
  }

  &:hover {
    color: var(--bs-primary);
  }
}
.nav-link .label {
  font-size: 0.85rem;
  margin-top: 0.25rem;
  color: var(--bs-secondary-text);
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
