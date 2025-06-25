<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useProfileStore } from '@/store/profileStore'

import PublicProfileComponent from '@/components/profiles/public/PublicProfileComponent.vue'

import BlockProfileDialog from '../components/profiles/public/BlockProfileDialog.vue'
import PublicProfileSecondaryNav from '../components/profiles/public/PublicProfileSecondaryNav.vue'
import { useToast } from 'vue-toastification'

const router = useRouter()
const profileStore = useProfileStore()

// Props
const props = defineProps<{
  id: string
}>()

// Local state
const profile = reactive<PublicProfileWithContext>({} as PublicProfileWithContext)
const error = ref<string | null>(null)
const showModal = ref(false)

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
const toast = useToast()

const handleBlock = async () => {
  const res = await profileStore.blockProfile(profile.id)
  showModal.value = false
  if (res.success) {
    toast('Successfully blocked profile')
    router.back()
  } else {
    error.value = res.message
  }
}
</script>

<template>
  <main class="container">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 mx-auto">
        <div class="my-2">
          <PublicProfileSecondaryNav
            @intent:back="$router.back()"
            @intent:block="showModal = true"
          />
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
      </div>
    </div>
    <BlockProfileDialog
      :profile="profile"
      v-model="showModal"
      :loading="profileStore.isLoading"
      @block="handleBlock"
    />
  </main>
</template>
