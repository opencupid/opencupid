<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

import ProfileInteractions from '@/features/interaction/components/ProfileInteractions.vue'

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
    toast.warning("You won't see them again.")
  }
  emit('hidden', profile.value.id)
}
</script>

<template>
  <div :class="{ dating: profile.isDatingActive }" class="public-profile" style="min-height: 100%;">
    <StoreErrorOverlay v-if="error" :error="error">
      <template #default="{ error }">
        <BButton v-if="error.status" variant="primary" @click="$emit('intent:back')">
          Keep browsing though!
        </BButton>
      </template>
    </StoreErrorOverlay>

    <div v-else class="h-100 position-relative">
      <div class="secondary-nav position-absolute w-100 py-2 text-color-white">
        <PublicProfileSecondaryNav
          @intent:back="$emit('intent:back')"
          @intent:block="showModal = true"
        />
      </div>
      <BPlaceholderWrapper :loading="isLoading">
        <template #loading>
          <BPlaceholderCard class="w-100 opacity-50" img-height="250" animation="glow" no-button />
        </template>

        <ProfileContent :profile :isLoading="isLoading" class="" />

        <div class="interactions position-fixed w-100">
          <ProfileInteractions
            :profile="profile"
            @intent:message="(convoId: string) => emit('intent:message', convoId)"
            @updated="refreshProfile"
            @passed="$emit('hidden', profile.id)"
          />
        </div>
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

<style scoped>
.secondary-nav {
  z-index: 1040;
}
.interactions {
  bottom: 1rem;
  left: 0;
}
</style>
