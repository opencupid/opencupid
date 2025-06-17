<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DoodleIcons from '@/components/icons/DoodleIcons.vue'

import { useAuthStore } from '@/store/authStore'

import { computed } from 'vue'
import { useMessageStore } from '@/store/messageStore'

const authStore = useAuthStore()

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
      <BNavItem to="/onboarding" active-class="active">
        <DoodleIcons name="IconPen" class="svg-icon-lg" />
        <span class="d-none d-sm-inline">{{ $t('nav.onboarding') }}</span>
      </BNavItem>

      <BNavItem to="/me" active-class="active">
        <DoodleIcons name="IconUser" class="svg-icon-lg" />
        <span class="d-none d-sm-inline">{{ $t('nav.profile') }}</span>
      </BNavItem>

      <BNavItem to="/browse" active-class="active">
        <DoodleIcons name="IconSearch" class="svg-icon-lg" />
        <span class="d-none d-sm-inline">{{ $t('nav.browse') }}</span>
      </BNavItem>

      <BNavItem to="/inbox" active-class="active">
        <span class="icon-wrapper position-relative">
          <DoodleIcons name="IconMessage" class="svg-icon-lg" />
          <FontAwesomeIcon
          v-if="hasUnreadMessages"
            icon="fa-solid fa-circle"
            class="text-danger position-absolute top-0 start-55 translate-middle"
            style="font-size: 0.75rem"
          />
        </span>
        <span class="d-none d-sm-inline">{{ $t('nav.inbox') }}</span>
      </BNavItem>

      <BNavItem to="/settings" active-class="active">
        <DoodleIcons name="IconSetting2" class="svg-icon-lg" />
        <span class="d-none d-sm-inline"> {{ $t('nav.settings') }}</span>
      </BNavItem>
    </BNavbarNav>
  </BNavbar>
</template>

<style scoped>
.svg-icon {
  /* width: 1.5rem; */
  /* height: 1.5rem; */
  /* margin-right: 0.5rem; */
  /* padding: 0rem; */
}
</style>
