<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { useColorMode } from 'bootstrap-vue-next'
import { type LoginUser } from '@zod/user/user.types'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'

import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'
import LanguageSelectorDropdown from '../components/LanguageSelectorDropdown.vue'
import PushPermissions from '../components/PushPermissions.vue'
import VersionInfo from '../components/VersionInfo.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'

const authStore = useAuthStore()

const user = reactive({} as LoginUser)
const isLoading = ref(true)

const mode = useColorMode({
  selector: 'html',
  attribute: 'data-bs-theme',
  storageKey: 'theme',
  modes: {
    light: 'light',
    dark: 'dark',
  },
})

const changeColor = () => {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}

onMounted(async () => {
  isLoading.value = true
  const res = await authStore.fetchUser()

  if (res.success) {
    const { user: fetched } = res
    Object.assign(user, fetched)
  } else {
    const { message } = res
    console.error('Failed to fetch user:', message)
  }
  isLoading.value = false
})
</script>

<template>
  <main class="container mt-4">
    <RouterBackButton />

    <h2 class="mb-4 d-flex align-items-center justify-content-center w-100">
      <IconSetting2 class="svg-icon me-2" />
      Settings
    </h2>

    <LoadingComponent v-if="isLoading" />

    <div class="mb-3 d-flex align-items-center">
      <div class="me-2">
        <span v-if="user.email">Email: {{ user.email }}</span>
        <span v-if="user.phonenumber">Phone number: {{ user.phonenumber }}</span>
      </div>
      <LogoutButton />
    </div>

    <div class="mb-3"></div>

    <div class="mb-3">
      <button class="btn btn-secondary" @click="changeColor">Toggle night or day</button>
    </div>

    <div class="mb-3">
      <PushPermissions />
    </div>
    <div class="mb-3">
      <LanguageSelectorDropdown />
    </div>

    <div class="mb-3">
      <VersionInfo />
    </div>
  </main>
</template>
