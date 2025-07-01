<script setup lang="ts">
import z from 'zod'
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'

import { type ProfileScope, ProfileScopeSchema } from '@zod/profile/profile.dto'

import PublicProfile from '@/features/publicprofile/components/PublicProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import ReceivedLikesCount from '@/features/interaction/components/ReceivedLikesCount.vue'

import { useFindMatchViewModel } from '../composables/useFindMatchViewModel'
import DatingPreferencesForm from '../components/DatingPreferencesForm.vue'
import SecondaryNav from '../components/SecondaryNav.vue'
import ProfileCardGrid from '../components/ProfileCardGrid.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import PlaceholdersGrid from '../components/PlaceholdersGrid.vue'

const router = useRouter()

const props = defineProps<{
  scope?: string
  profileId?: string
}>()

// state management
const showModal = ref(false)
const canGoBack = ref(false)

const {
  viewerProfile,
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

const handleEditProfileIntent = () => {
  router.push({ name: 'EditProfile' })
}

const handleCloseProfileView = () => {
  router.back()
  selectedProfileId.value = null
}

const handleOpenConversation = (conversationId: string) => {
  router.push({
    name: 'Messaging',
    params: { conversationId },
  })
}

const handleHidden = (id: string) => {
  hideProfile(id)
  selectedProfileId.value = null
  canGoBack.value = false
}

// Provide the me object (current user's profile) to child components
provide('viewerProfile', viewerProfile.value)

const isDetailView = computed(() => !!selectedProfileId.value)
</script>

<template>
  <main class="w-100">
    <!-- this is the container for the detail view -->
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100"
      :class="{ active: isDetailView }"
    >
      <div class="overflow-auto h-100">
        <MiddleColumn class="pt-md-3 position-relative pb-5">
          <PublicProfile
            v-if="selectedProfileId"
            :id="selectedProfileId"
            class="shadow-lg"
            @intent:back="handleCloseProfileView"
            @intent:message="handleOpenConversation"
            @hidden="(id: string) => handleHidden(id)"
          />
        </MiddleColumn>
      </div>
    </div>

    <div
      class="grid-view d-flex flex-column justify-content-start"
      :class="[currentScope, { inactive: isDetailView }]"
    >
      <MiddleColumn class="my-2">
        <div class="container d-flex flex-column">
          <SecondaryNav
            v-model="currentScope"
            @edit:datingPrefs="showModal = true"
            @scope:change="(scope: ProfileScope) => (currentScope = scope)"
            :prefs-button-disabled="!haveAccess"
          />

          <ReceivedLikesCount class="my-3" v-if="currentScope == 'dating'" />
        </div>
      </MiddleColumn>
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
            <!-- Placeholders while loading -->
            <MiddleColumn class="overflow-hidden">
              <PlaceholdersGrid :howMany="6" :loading="true" />
            </MiddleColumn>
          </BOverlay>
        </template>

        <!-- After loading -->
        <template v-if="!haveAccess || !haveResults">
          <BOverlay show no-spinner no-center :blur="null" bg-color="inherit" class="h-100 overlay">
            <!-- Keep placeholders in background -->
            <MiddleColumn class="overflow-hidden">
              <PlaceholdersGrid :howMany="6" :loading="false" />
            </MiddleColumn>

            <!-- CTA overlay -->
            <template #overlay>
              <MiddleColumn class="h-100">
                <div
                  class="h-100 w-100 d-flex flex-column align-items-center justify-content-center p-2"
                >
                  <NoAccessCTA
                    v-if="!haveAccess"
                    v-model="currentScope"
                    @edit:profile="handleEditProfileIntent"
                  />
                  <NoResultsCTA v-else-if="!haveResults" />
                  <!-- <StoreErrorOverlay v-else-if="storeError" :error="storeError">
                    <template #default="{ error }">
                      <BButton
                        v-if="error.status"
                        variant="primary"
                        @click="$router.push({ name: 'BrowseProfiles' })"
                      >
                        Keep browsing though!
                      </BButton>
                    </template>
                  </StoreErrorOverlay> -->
                </div>
              </MiddleColumn>
            </template>
          </BOverlay>
        </template>

        <!-- Main profile results -->
        <template v-else>
          <div class="overflow-auto">
            <MiddleColumn>
              <ProfileCardGrid :profiles="profileList" @profile:select="handleCardClick" />
            </MiddleColumn>
          </div>
        </template>
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
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.detail-view {
  top: 0;
  left: 0;
  // nav.fixed is on 1030 - on screens < md we put this above the navbar
  z-index: 1050;
  height: 100vh;

  @include media-breakpoint-up(sm) {
    // on screens > sm navbar stays visible
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 900;
  }
}

.grid-view {
  height: calc(100vh - $navbar-height);
}

.inactive {
  pointer-events: none;
  visibility: hidden;
  display: none;
}
main {
  width: 100%;
  // height: 100vh;
}
</style>
