<script lang="ts" setup>
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useRouter } from 'vue-router'
import IconLogout from '@/assets/icons/interface/logout.svg'
import { useI18n } from 'vue-i18n'
import { type BaseButtonVariant } from 'bootstrap-vue-next'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

function handleClick() {
  auth.logout() // Clear the authentication state
  router.push({ name: 'Login' }) // Redirect to the login page
}

const props = withDefaults(
  defineProps<{
    variant?: keyof BaseButtonVariant
    size?: string
  }>(),
  {
    variant: 'primary',
    size: 'sm',
  }
)
</script>

<template>
  <BButton  v-bind:variant="variant" size="sm" @click="handleClick">
    <slot>
      <IconLogout class="svg-icon" />
      {{ t('authentication.logout') }}
    </slot>
  </BButton>
</template>
