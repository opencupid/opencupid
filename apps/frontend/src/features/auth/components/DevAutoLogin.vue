<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')

async function handleContinue() {
  const authId = localStorage.getItem('authId')
  if (!authId) {
    error.value = 'No authId in localStorage — go back and enter an email first.'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const { data } = await api.get<{ token: string }>('/auth/dev/latest-token', {
      params: { authId },
    })

    const res = await authStore.verifyToken(data.token)
    if (res.success) {
      await router.push({ name: 'UserHome' })
    } else {
      error.value = res.message ?? 'Token verification failed'
    }
  } catch (e: any) {
    error.value = e.response?.data?.code ?? e.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="d-flex flex-column align-items-center gap-3">
    <div class="badge bg-warning text-dark">DEV MODE</div>
    <p class="text-muted text-center">OTP was sent — click below to auto-verify without Mailpit.</p>

    <BButton
      variant="primary"
      size="lg"
      :disabled="isLoading"
      @click="handleContinue"
    >
      <BSpinner
        v-if="isLoading"
        small
      />
      Continue
    </BButton>

    <div
      v-if="error"
      class="text-danger text-center"
    >
      {{ error }}
    </div>
  </div>
</template>
