<script setup lang="ts">
import z from 'zod'
import { useRouter } from 'vue-router'
import { onMounted, onUnmounted, ref } from 'vue'

import { type ProfileScope, ProfileScopeSchema } from '@zod/profile/profile.dto'

import { useFindMatchViewModel } from '../composables/useFindMatchViewModel'
import DatingPreferencesForm from '../components/DatingPreferencesForm.vue'
import SecondaryNav from '../components/SecondaryNav.vue'
import ProfileCardGrid from '../components/ProfileCardGrid.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import PlaceholdersGrid from '../components/PlaceholdersGrid.vue'
import PublicProfile from '@/features/publicprofile/components/PublicProfile.vue'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'

const router = useRouter()

const props = defineProps<{
  scope?: string
  profileId?: string
}>()

// state management
const showModal = ref(false)
const canGoBack = ref(false)

const {
  haveAccess,
  haveResults,
  isLoading,
  currentScope,
  profileList,
  storeError,
  datingPrefs,
  selectedProfileId,
  hideProfile,
  updateDatingPrefs,
  initialize,
  reset,
} = useFindMatchViewModel()

// const { fetchProfile, refreshProfile, blockProfile, profile } = usePublicProfile()
const ParamsSchema = z.object({
  scope: ProfileScopeSchema.optional(),
  profileId: z.string().optional(),
})

onMounted(async () => {
  const params = ParamsSchema.safeParse(props)
  if (params.success) {
    const { scope, profileId } = params.data
    if (profileId) {
      selectedProfileId.value = profileId
      canGoBack.value = false
    }
    await initialize(scope)
  }
})

onUnmounted(() => {
  selectedProfileId.value = null
  canGoBack.value = false
  reset()
})

const handleCardClick = async (profileId: string) => {
  // const res = await fetchProfile(profileId)
  selectedProfileId.value = profileId
  canGoBack.value = true
  // profileDetailId.value = profileId
  router.push({
    name: 'PublicProfile',
    params: {
      profileId: profileId,
    },
  })
}

// const handlePrefsClick = () => {
//   showModal.value = true
// }

const handleEditProfileIntent = () => {
  router.push({ name: 'EditProfile' })
}

const handleCloseProfileView = () => {
  selectedProfileId.value = null
  router.back()
}

const handleOpenConversation = (conversationId: string) => {
  router.push({
    name: 'Messaging',
    params: { conversationId },
  })
}
</script>

<template>
  <main class="container h-100">
    <StoreErrorOverlay v-if="storeError" :error="storeError">
      <template #default="{ error }">
        <BButton
          v-if="error.status"
          variant="primary"
          @click="$router.push({ name: 'BrowseProfiles' })"
        >
          Keep browsing though!
        </BButton>
      </template>
    </StoreErrorOverlay>

    <div v-else class="row d-flex justify-content-center h-100" :class="currentScope">
      <div class="col-12 col-md-6 mx-auto h-100 position-relative overflow-hidden">
        <div id="profile-view" v-if="selectedProfileId" class="overflow-auto" :class="{ active: selectedProfileId }">
          <PublicProfile
            :id="selectedProfileId"
            @intent:back="handleCloseProfileView"
            @intent:message="handleOpenConversation"
            @hidden="(id: string) => hideProfile(id)"
          />
        </div>

        <div
          class="h-100 overflow-hidden position-relative d-flex flex-column"
          :class="{ inactive: selectedProfileId }"
        >
          <div class="my-3">
            <SecondaryNav
              v-model="currentScope"
              @edit:datingPrefs="showModal = true"
              @scope:change="(scope: ProfileScope) => (currentScope = scope)"
              :prefs-button-disabled="!haveAccess"
            />
          </div>
          <BPlaceholderWrapper :loading="isLoading">
            <template #loading>
              <BOverlay
                show
                no-spinner
                no-center
                :blur="null"
                bg-color="inherit"
                class="h-100 overlay"
                spinner-variant="primary"
                spinner-type="grow"
              >
                <div class="row row-cols-1 row-cols-sm-2 row-cols-md-2 g-4 my-0 overflow-hidden">
                  <PlaceholdersGrid :howMany="6" :loading="isLoading" />
                </div>
                <template #overlay>
                  <div
                    v-if="!isLoading"
                    class="h-100 w-100 d-flex flex-column align-items-center justify-content-center p-2"
                  >
                    <NoAccessCTA
                      v-if="!haveAccess"
                      v-model="currentScope"
                      @edit:profile="handleEditProfileIntent"
                    />
                    <NoResultsCTA v-else-if="!haveResults" />
                  </div>
                </template>
              </BOverlay>
            </template>

            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-2 g-4 my-0 overflow-auto h-100">
              <ProfileCardGrid :profiles="profileList" @profile:select="handleCardClick" />
            </div>
          </BPlaceholderWrapper>

          <BModal
            v-model="showModal"
            centered
            button-size="sm"
            :focus="false"
            :no-close-on-backdrop="true"
            fullscreen="sm"
            :no-footer="false"
            :no-header="true"
            cancel-title="Nevermind"
            initial-animation
            :body-scrolling="false"
            title="Add a photo"
            @ok="updateDatingPrefs"
          >
            <DatingPreferencesForm v-model="datingPrefs" v-if="datingPrefs" />
          </BModal>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
#profile-view {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  height: 100%;
  width: 100%;
}
.inactive {
  pointer-events: none;
  visibility: hidden;
}
</style>
