<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import router from '@/router'

const logout = () => {
  const authStore = useAuthStore()
  authStore.initialize()
  authStore.logout()
  // console.log('User logged out successfully')
  router.push({ name: 'Login' })
}
</script>
<template>
  <main>
    <BButton
      variant="primary"
      class=""
      @click="logout"
    >
      Logout
    </BButton>
  </main>
</template>
