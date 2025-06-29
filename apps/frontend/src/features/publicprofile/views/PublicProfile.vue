<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

import DatingInteractions from '@/features/datinginteraction/components/DatingInteractions.vue'

import { usePublicProfile } from '../composables/usePublicProfile'
import ProfileContent from '../components/ProfileContent.vue'
import BlockProfileDialog from '../components/BlockProfileDialog.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'
import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'

// Props
const props = defineProps<{
  id: string
}>()

const emit = defineEmits<{
  (e: 'intent:back'): void
  (e: 'intent:message', conversationId: string): void
  (e: 'hidden', profileId: string): void
  (e: 'updated'): void
}>()

// Local state
const showModal = ref(false)

const { fetchProfile, refreshProfile, blockProfile, profile, isLoading, error } = usePublicProfile()

onMounted(async () => {
  const res = await fetchProfile(props.id)
})

const toast = useToast()

const handleBlock = async () => {
  const ok = await blockProfile()
  showModal.value = false
  if (ok) {
    toast('Successfully blocked profile')
  }
  emit('hidden', profile.value.id)
}
</script>

<template>
  <div>
    <StoreErrorOverlay v-if="error" :error="error">
      <template #default="{ error }">
        <BButton v-if="error.status" variant="primary" @click="$emit('intent:back')">
          Keep browsing though!
        </BButton>
      </template>
    </StoreErrorOverlay>

    <div v-else class="h-100">
      <div class="my-2">
        <PublicProfileSecondaryNav
          @intent:back="$emit('intent:back')"
          @intent:block="showModal = true"
        />
      </div>
      <BPlaceholderWrapper :loading="isLoading">
        <template #loading>
          <BPlaceholderCard class="w-100 opacity-50" img-height="250" animation="glow" no-button />
        </template>

        <ProfileContent :profile :isLoading="isLoading" />

        <DatingInteractions
          v-if="profile.isDatingActive"
          :profile="profile"
          @intent:message="(convoId: string) => emit('intent:message', convoId)"
          @updated="$emit('intent:back')"
          @passed="$emit('hidden', profile.id)"
        />
      </BPlaceholderWrapper>
    </div>
    <BlockProfileDialog
      :profile="profile"
      v-model="showModal"
      :loading="isLoading"
      @block="handleBlock"
    />
  </div>
</template>
