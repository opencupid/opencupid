<script setup lang="ts">
import { IconSetting2 } from '@/components/icons/DoodleIcons'
import LoadingComponent from '@/components/LoadingComponent.vue'
import LogoutButton from '@/components/nav/LogoutButton.vue'
import { useAuthStore } from '@/store/authStore'
import { type LoginUser } from '@zod/user.schema'
import { onMounted, reactive, ref } from 'vue'
import { useColorMode } from 'bootstrap-vue-next'
import { useLocalStore } from '@/store/localStore'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()

const user = reactive({} as LoginUser)
const isLoading = ref(true)
const { t } = useI18n()

const mode = useColorMode({
  selector: 'html',
  attribute: 'data-bs-theme',
  storageKey: 'theme',
  modes: {
    light: 'light',
    dark: 'dark',
  },
})
console.log('mode', mode.value)

const changeColor = () => {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}

onMounted(async () => {
  isLoading.value = true
  const { success, user: fetched, error } = await authStore.fetchUser()

  if (success) {
    Object.assign(user, fetched)
  } else {
    console.error('Failed to fetch user:', error)
  }
  isLoading.value = false
})
</script>

<template>
  <div class="container mt-4">
    <h3 class="mb-4">
      <IconSetting2 class="svg-icon" />
      {{ t('nav.settings') }}
    </h3>

    <LoadingComponent v-if="isLoading" />

    <div class="mb-3">
      <p v-if="user.email">{{ t('auth.email') }}: {{ user.email }}</p>
      <p v-if="user.phonenumber">{{ t('settings.phone_number') }}: {{ user.phonenumber }}</p>
    </div>

    <div class="mb-3">
      <LogoutButton />
    </div>

    <div class="mb-3">
      <button class="btn btn-secondary" @click="changeColor">
        {{ t('settings.toggle_theme') }}
      </button>
    </div>
  </div>
</template>
