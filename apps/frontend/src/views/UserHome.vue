<template>
  <main class="container">
    <h2>Home</h2>
    <ReceivedLikesCount class="my-3" />
  </main>
</template>

<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ReceivedLikesCount from '@/features/interaction/components/ReceivedLikesCount.vue'

const profileStore = useOwnerProfileStore()
const router = useRouter()
const error = ref<string>('')

onMounted(async () => {
  await profileStore.fetchOwnerProfile()
  console.log('Profile fetched:', profileStore.profile)
  if (!profileStore.profile) {
    error.value = 'Something went wrong (owner profile)'
    return
  }
  if (!profileStore.profile.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }
})
</script>
