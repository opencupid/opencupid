<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useProfileStore } from '@/store/profileStore'

import DatingInteractions from '@/features/datinginteraction/components/DatingInteractions.vue'

import ProfileContent from '../components/ProfileContent.vue'
import BlockProfileDialog from '../components/BlockProfileDialog.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'
import ActionButtons from '../components/ActionButtons.vue'
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
import { useDatingInteractions } from '@/features/datinginteraction/composables/useDatingInteractions'

const { like, unlike, pass, unpass, refreshLikes, loadingLikes } = useDatingInteractions()

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

const handleLike = async () => {
  await like(profile.id)
  toast('Successfully liked profile')
}

const handlePass = async () => {
  await pass(profile.id)
  toast('Successfully passed profile')
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

        <ProfileContent
          :profile
          :isLoading="profileStore.isLoading"
        />
        <div>
          <DatingInteractions
            v-if="profile.isDatingActive"
            :profile="profile"
            @intent:pass="handlePass"
            @intent:like="handleLike"
          />
        </div>

        <ActionButtons
          :profile
          @intent:conversation:open="
            (conversationId: string) => handleOpenConversation(conversationId)
          "
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
