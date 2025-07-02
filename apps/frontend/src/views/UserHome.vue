<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ReceivedLikesCount from '@/features/interaction/components/ReceivedLikesCount.vue'

const profileStore = useOwnerProfileStore()
const router = useRouter()
// Line removed as it is unused.
</script>

<template>
  <main class="container">
    <h2>Welcome to Gaians.</h2>
    <ReceivedLikesCount class="my-3" />
  </main>
</template>
