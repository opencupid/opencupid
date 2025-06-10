<template>
  <a @click="handleClick" href="#" class="btn btn-secondary">
    <IconLogout class="svg-icon" />
    {{ t('authentication.logout') }}</a
  >
</template>

<script lang="ts" setup>
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'vue-router'
import { IconLogout } from '@/components/icons/DoodleIcons'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const auth = useAuthStore()
const router = useRouter()

function handleClick() {
  auth.logout() // Clear the authentication state
  router.push({ name: 'Login' }) // Redirect to the login page
}
</script>
