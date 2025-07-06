<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useColorMode } from 'bootstrap-vue-next'
import { type LoginUser } from '@zod/user/user.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useLocalStore } from '@/store/localStore'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'

import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'
import LanguageSelectorDropdown from '../components/LanguageSelectorDropdown.vue'
import PushPermissions from '../components/PushPermissions.vue'
import VersionInfo from '../components/VersionInfo.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const localStore = useLocalStore()

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

watch(mode, newMode => {
  localStore.setTheme(newMode)
})

const changeColor = () => {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}

onMounted(async () => {
  isLoading.value = true
  mode.value = localStore.getTheme as any
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

function handleClick() {
  authStore.logout()
  console.log('User logged out sending to /auth')
  router.push({ name: 'Login' })
}
</script>

<template>
  <main class="container">
    <div class="d-flex flex-column justify-content-center align-items-center h-100 w-100">
      <LoadingComponent v-if="isLoading" />
      <SecondaryNav>
        <template #items-left>
          <RouterBackButton />
        </template>
        <template #items-center>
          <IconSetting2 class="svg-icon me-2" />
          Settings
        </template>
      </SecondaryNav>

      <section class="w-100 flex-grow-1">
        <BOverlay :show="false" class="h-100 d-flex flex-column justify-content-center">
          <div class="mb-3">
            <div class="me-2">
              <span v-if="user.email">Email: {{ user.email }}</span>
              <span v-if="user.phonenumber">Phone number: {{ user.phonenumber }}</span>
            </div>
            <BButton variant="primary" size="sm" @click="handleClick">
              <IconLogout class="svg-icon" />
              {{ $t('authentication.logout') }}</BButton
            >
          </div>

          <div class="mb-3"></div>

          <!-- <div class="mb-3">
      <button class="btn btn-secondary" @click="changeColor">Toggle night or day</button>
    </div> -->

          <!-- <div class="mb-3">
      <PushPermissions />
    </div> -->
          <div class="mb-3">
            <LanguageSelectorDropdown />
          </div>
        </BOverlay>
      </section>
      <div class="position-fixed bottom-0 w-100 p-2">
        <VersionInfo />
      </div>
    </div>
  </main>
</template>
