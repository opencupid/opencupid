<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'

import PublicProfileComponent from '@/features/publicprofile/components/PublicProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

import { useFindMatchViewModel } from '../composables/useFindMatchViewModel'
import DatingPreferencesForm from '../components/DatingPreferencesForm.vue'
import SocialFilterForm from '../components/SocialFilterForm.vue'
import SecondaryNav from '../../shared/ui/SecondaryNav.vue'
import ProfileCardGrid from '../components/ProfileCardGrid.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import PlaceholdersGrid from '../components/PlaceholdersGrid.vue'
import SocialFilterDisplay from '../components/SocialFilterDisplay.vue'
import DatingPrefsDisplay from '../components/DatingPrefsDisplay.vue'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'

import OsmPoiMap from '@/features/shared/components/OsmPoiMap.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { useI18n } from 'vue-i18n'
import { useCountries } from '../../shared/composables/useCountries'

import IconMap from '@/assets/icons/interface/map.svg'
import GridButton from '../../shared/ui/GridButton.vue'

const router = useRouter()
const { t } = useI18n()
// state management
const showPrefsModal = ref(false)
const canGoBack = ref(false)

const {
  viewerProfile,
  haveAccess,
  haveResults,
  isLoading,
  isLoadingMore,
  hasMoreProfiles,
  currentScope,
  scopeModel,
  viewModeModel,
  profileList,
  storeError,
  datingPrefs,
  socialFilter,
  selectedProfileId,
  hideProfile,
  updatePrefs,
  openProfile,
  closeProfile,
  initialize,
  reset,
  isInitialized,
  loadMoreProfiles,
} = useFindMatchViewModel()

onMounted(async () => {
  await initialize()
})

onUnmounted(() => {
  canGoBack.value = false
  reset()
})

const handleCardClick = async (profileId: string) => {
  canGoBack.value = true
  openProfile(profileId)
}

const handleEditProfileIntent = () => {
  router.push({
    name: 'EditProfile',
    state: {
      hint: 'scope',
    },
  })
}

const handleCloseProfileView = () => {
  closeProfile()
}

const handleOpenConversation = (conversationId: string) => {
  router.push({
    name: 'Messaging',
    params: { conversationId },
  })
}

const handleHidden = (id: string) => {
  hideProfile(id)
  canGoBack.value = false
}

const { countryCodeToName } = useCountries()

const countryName = computed(() => {
  if (!socialFilter) return ''
  return countryCodeToName(socialFilter?.value?.location.country ?? '')
})

// Provide the viewerProfile object (current user's profile) to child components
provide('viewerProfile', viewerProfile)

const isDetailView = computed(() => !!selectedProfileId.value)

// Infinite scroll setup
const scrollContainer = ref<HTMLElement>()

useInfiniteScroll(
  scrollContainer,
  async () => {
    console.log('🔄 BrowseProfiles - infinite scroll triggered', {
      isLoadingMore: isLoadingMore.value,
      hasMoreProfiles: hasMoreProfiles.value,
      isInitialized: isInitialized.value,
      currentScope: currentScope.value,
    })

    if (isLoadingMore.value || !hasMoreProfiles.value || !isInitialized.value) {
      return
    }

    await loadMoreProfiles()
  },
  {
    distance: 300, // Trigger when 300px from bottom
    canLoadMore: () => hasMoreProfiles.value && !isLoadingMore.value && isInitialized.value,
  }
)
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <!-- this is the container for the detail view -->
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100 h-100"
      :class="{ active: isDetailView }"
    >
      <div class="overflow-auto hide-scrollbar h-100 d-flex flex-column">
        <MiddleColumn
          class="pt-sm-3 position-relative flex-grow-1"
          style="min-height: 100%"
        >
          <PublicProfileComponent
            v-if="selectedProfileId"
            :id="selectedProfileId"
            class="shadow-lg mb-3 pb-5"
            @intent:back="handleCloseProfileView"
            @intent:message="handleOpenConversation"
            @hidden="(id: string) => handleHidden(id)"
          />
        </MiddleColumn>
      </div>
    </div>

    <div
      class="list-view d-flex flex-column justify-content-start"
      :class="[currentScope, { inactive: isDetailView }]"
    >
      <MiddleColumn class="my-2">
        <div class="container d-flex flex-column">
          <SecondaryNav>
            <template #items-center>
              <ScopeViewToggler v-model="scopeModel" />
            </template>
          </SecondaryNav>
          <div
            v-if="currentScope == 'social'"
            class="filter-controls my-2"
          >
            <div
              class="d-flex align-items-center justify-content-between w-100 px-2 py-1 bg-light rounded"
            >
              <SocialFilterDisplay
                v-if="socialFilter && haveAccess"
                v-model="socialFilter"
                :viewerLocation="viewerProfile?.location"
                @prefs:toggle="showPrefsModal = true"
                @filter:changed="updatePrefs"
              />
              <ViewModeToggler v-model="viewModeModel" />
            </div>
          </div>
          <div
            v-if="currentScope == 'dating'"
            class="filter-controls my-2"
          >
            <DatingPrefsDisplay
              v-if="datingPrefs && haveAccess"
              v-model="datingPrefs"
              :viewerLocation="viewerProfile?.location"
              @prefs:toggle="showPrefsModal = true"
            />
          </div>
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
              <PlaceholdersGrid
                :howMany="6"
                :isAnimated="true"
              />
            </MiddleColumn>
          </BOverlay>
        </template>

        <!-- After loading -->
        <template v-if="isInitialized && !haveAccess">
          <BContainer class="flex-grow-1 d-flex align-items-center justify-content-center">
            <MiddleColumn class="">
              <NoAccessCTA
                v-if="!haveAccess"
                v-model="currentScope"
                @edit:profile="handleEditProfileIntent"
              />
            </MiddleColumn>
          </BContainer>
        </template>

        <template v-if="isInitialized && !haveResults && haveAccess">
          <BContainer class="flex-grow-1 d-flex align-items-center justify-content-center">
            <MiddleColumn class="">
              <div class="mb-3">
                <!-- There's nobody in your area that matches your preferences, yet. -->
                {{
                  t('profiles.browse.social_no_results', {
                    country: countryName,
                  })
                }}
              </div>
              <NoResultsCTA />
            </MiddleColumn>
          </BContainer>
        </template>

        <!-- Main profile results -->
        <template v-else-if="isInitialized && haveResults">
          <div
            ref="scrollContainer"
            class="overflow-auto hide-scrollbar pb-5 flex-grow-1"
          >
            <MiddleColumn
              v-if="viewModeModel === 'grid'"
              class="grid-view"
            >
              <ProfileCardGrid
                :profiles="profileList"
                :showTags="true"
                :showLocation="true"
                @profile:select="handleCardClick"
              />

              <!-- Infinite scroll loading indicator -->
              <div
                v-if="isLoadingMore"
                class="text-center py-3"
              >
                <BSpinner
                  variant="primary"
                  small
                />
                <span class="ms-2 text-muted">{{
                  $t('profiles.browse.loading_more_profiles')
                }}</span>
              </div>

              <!-- No more profiles indicator -->
              <!-- <div v-else-if="!hasMoreProfiles && profileList.length > 0" class="text-center py-3 text-muted">
              </div> -->
            </MiddleColumn>
            <OsmPoiMap
              v-if="viewModeModel === 'map'"
              :items="profileList"
              :get-location="(profile: PublicProfile) => profile.location"
              :get-title="(profile: PublicProfile) => profile.publicName"
              :popup-component="ProfileMapCard"
              class="map-view h-100"
              @item:select="(id: string | number) => handleCardClick(String(id))"
            />
          </div>
        </template>
      </BPlaceholderWrapper>

      <BModal
        v-model="showPrefsModal"
        centered
        button-size="sm"
        :focus="false"
        :no-close-on-backdrop="true"
        fullscreen="sm"
        :no-footer="false"
        :no-header="true"
        :cancel-title="t('profiles.browse.filters.dialog_cancel_button')"
        cancel-variant="link"
        ok-title="Search"
        initial-animation
        :body-scrolling="false"
        title="Add a photo"
        @ok="updatePrefs"
      >
        <DatingPreferencesForm
          v-model="datingPrefs"
          v-if="currentScope === 'dating' && datingPrefs"
        />
        <SocialFilterForm
          v-model="socialFilter"
          :viewerProfile="viewerProfile"
          v-if="currentScope === 'social' && socialFilter"
        />
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
  // nav.fixed is on 1030 - on screens < md we put this above the navbar
  z-index: 1050;
  height: 100dvh;
  inset: 0;

  @include media-breakpoint-up(sm) {
    // on screens > sm navbar stays visible
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 900;
  }
}

.list-view {
  height: calc(100vh - $navbar-height);
}

.inactive {
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
}
main {
  width: 100%;
  // height: 100vh;
}
.filter-controls {
  font-size: 0.75rem;
}
</style>
