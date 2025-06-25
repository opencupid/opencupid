<script setup lang="ts">
import LoadingComponent from '@/components/LoadingComponent.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { type LoginUser } from '@zod/user/user.types'
import { computed, onMounted, reactive, ref } from 'vue'
import { useColorMode } from 'bootstrap-vue-next'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import LanguageSelectorDropdown from '../components/LanguageSelectorDropdown.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'

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

const wsConnected = computed(() => {
  return !!useMessageStore().socket
})
const messageStore = useMessageStore()
</script>

<template>
  <main class="container mt-4">
    <h3 class="mb-4 d-flex align-items-center">
      <IconSetting2 class="svg-icon me-2" />
      Settings
    </h3>

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
  </main>
</template>
