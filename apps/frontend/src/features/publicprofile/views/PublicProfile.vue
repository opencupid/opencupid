<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useProfileStore } from '@/store/profileStore'

import DatingInteractions from '@/features/datinginteraction/components/DatingInteractions.vue'

import ProfileContent from '../components/ProfileContent.vue'
import BlockProfileDialog from '../components/BlockProfileDialog.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'
import { useToast } from 'vue-toastification'
import { usePublicProfile } from '../composables/usePublicProfile'
import ErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'

const router = useRouter()
const profileStore = useProfileStore()

// Props
const props = defineProps<{
  id: string
}>()

// Local state
const showModal = ref(false)

const { fetchProfile, refreshProfile, blockProfile, profile, isLoading, error } = usePublicProfile()

onMounted(async () => {
  const res = await fetchProfile(props.id)
})

const handleOpenConversation = (conversationId: string) => {
  router.push({
    name: 'Messaging',
    params: { conversationId },
  })
}
const toast = useToast()

const handleBlock = async () => {
  const ok = await blockProfile()
  showModal.value = false
  if (ok) {
    toast('Successfully blocked profile')
    router.back()
  }
}
</script>

<template>
  <main class="container">
    <ErrorOverlay v-if="error" :error>
      <template #default="{ error }">
        <BButton
          v-if="error.status"
          variant="primary"
          @click="$router.push({ name: 'BrowseProfiles' })"
        >
          Keep browsing though!
        </BButton>
      </template>
    </ErrorOverlay>

    <div v-else class="row justify-content-center">
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

        <ProfileContent :profile :isLoading="profileStore.isLoading" />

        <DatingInteractions
          v-if="profile.isDatingActive"
          :profile="profile"
          @intent:message="(convoId: string) => handleOpenConversation(convoId)"
          @updated="refreshProfile"
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
