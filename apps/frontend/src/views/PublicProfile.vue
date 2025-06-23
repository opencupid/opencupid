<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useProfileStore } from '@/store/profileStore'

import LoadingComponent from '@/components/LoadingComponent.vue'
import PublicProfileComponent from '@/components/profiles/public/PublicProfileComponent.vue'

import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

const router = useRouter()
const profileStore = useProfileStore()

// Props
const props = defineProps<{
  id: string
}>()

// Local state
const profile = reactive<PublicProfileWithContext>({} as PublicProfileWithContext)
const error = ref<string | null>(null)

onMounted(async () => {
  const profileId = props.id
  const res = await profileStore.getPublicProfile(profileId)
  if (!res.success) {
    error.value = res.message
    return
  }
  Object.assign(profile, res.data)
})

const handleOpenConversation = (conversationId: string) => {
  router.push({
    name: 'Messaging',
    params: { conversationId },
  })
}
</script>

<template>
  <main class="container">
    <div class="my-2">
      <a class="btn btn-secondary-outline" @click="router.back()">
        <IconArrowSingleLeft class="svg-icon" />
      </a>
    </div>
    <!-- <BPlaceholderWrapper :loading="profileStore.isLoading">
      <template #loading>
        <BPlaceholderCard class="w-100 opacity-50" img-height="250" animation="glow" no-button />
      </template> -->

      <PublicProfileComponent
        :profile
        :isLoading="profileStore.isLoading"
        @intent:conversation:open="handleOpenConversation"
      />
    <!-- </BPlaceholderWrapper> -->
  </main>
</template>
