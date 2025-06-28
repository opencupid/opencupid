<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'
import IconUser from '@/assets/icons/interface/user.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'

import { useAuthStore } from '@/features/auth/stores/authStore'

import { computed } from 'vue'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useProfileStore } from '@/store/profileStore'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import { faCircle } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const hasUnreadMessages = computed(() => useMessageStore().hasUnreadMessages)

function handleLogoutClick() {
  authStore.logout() // Clear the authentication state
  useRouter().push({ name: 'Login' }) // Redirect to the login page
}
</script>

<template>
  <BNavbar variant="secondary" fixed="top" class="" v-if="isLoggedIn">
    <BNavbarNav class="d-flex justify-content-between w-100">
      <BNavItem to="/browse" active-class="active">
        <IconSearch class="svg-icon-lg" />
        <span class="d-none d-sm-inline label">{{ $t('nav.browse') }}</span>
      </BNavItem>

      <BNavItem to="/inbox" active-class="active">
        <span class="icon-wrapper position-relative">
          <IconMessage class="svg-icon-lg" />
          <FontAwesomeIcon
            v-if="hasUnreadMessages"
            :icon="faCircle"
            class="text-danger position-absolute top-0 start-55 translate-middle"
            style="font-size: 0.75rem"
          />
        </span>
        <span class="d-none d-sm-inline label">{{ $t('nav.inbox') }}</span>
      </BNavItem>

      <BNavItemDropdown right>
        <template #button-content>
          <span v-if="profileStore.profile?.profileImages?.length" class="profile-thumbnail d-inline-flex">
            <ProfileImage
              :profile="profileStore.profile"
              class="img-fluid rounded"
              style="width: 2.5rem; height: 2.5rem"
            />
          </span>
          <IconUser v-else class="svg-icon-lg" />
        </template>
        <BDropdownItem to="/me" active-class="active">
          <IconUser class="svg-icon me-2" />
          {{ $t('nav.profile') }}
        </BDropdownItem>
        <BDropdownItem to="/settings" active-class="active">
          <IconSetting2 class="svg-icon me-2" />
          {{ $t('nav.settings') }}
        </BDropdownItem>
        <!-- <BDropdownItem href="#" @click="handleLogoutClick">
          <IconLogout class="svg-icon me-2" />
          {{ t('authentication.logout') }}
        </BDropdownItem> -->
      </BNavItemDropdown>
    </BNavbarNav>
  </BNavbar>
</template>

<style scoped>
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
</style>
