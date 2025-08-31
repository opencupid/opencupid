<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, provide, ref, nextTick } from 'vue'

import PublicProfile from '@/features/publicprofile/components/PublicProfile.vue'
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
import { useI18n } from 'vue-i18n'
import { useCountries } from '../../shared/composables/useCountries'
import { useFindProfileStore } from '../stores/findProfileStore'

const router = useRouter()
const { t } = useI18n()
// state management
const showPrefsModal = ref(false)
const canGoBack = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const findProfileStore = useFindProfileStore()

const {
  viewerProfile,
  haveAccess,
  haveResults,
  isLoading,
  currentScope,
  scopeModel,
  profileList,
  storeError,
  datingPrefs,
  socialFilter,
  selectedProfileId,
  hideProfile,
  updatePrefs,
  openProfile,
  initialize,
  reset,
  isInitialized,
} = useFindMatchViewModel()

onMounted(async () => {
  await initialize()
  await nextTick()
  observer = new IntersectionObserver(async entries => {
    if (entries[0].isIntersecting) {
      await loadMore()
    }
  }, { root: scrollContainer.value })
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
})

onUnmounted(() => {
  canGoBack.value = false
  reset()
  observer?.disconnect()
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
  router.back()
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
  if (!socialFilter ) return ''
  return countryCodeToName(socialFilter?.value?.location.country ?? '')
})

// Provide the viewerProfile object (current user's profile) to child components
provide('viewerProfile', viewerProfile)

const isDetailView = computed(() => !!selectedProfileId.value)

const loadMore = async () => {
  console.log('loadMore', currentScope.value, findProfileStore.nextCursor)
  if (!findProfileStore.nextCursor) return
  if (currentScope.value === 'social') {
    await findProfileStore.loadMoreSocial()
  } else if (currentScope.value === 'dating') {
    await findProfileStore.loadMoreDating()
  }
}
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
        <MiddleColumn class="pt-sm-3 position-relative flex-grow-1" style="min-height: 100%">
          <PublicProfile
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
      class="grid-view d-flex flex-column justify-content-start"
      :class="[currentScope, { inactive: isDetailView }]"
    >
      <MiddleColumn class="my-2">
        <div class="container d-flex flex-column">
          <SecondaryNav>
            <template #items-center>
              <ScopeViewToggler v-model="scopeModel" />
            </template>
          </SecondaryNav>
          <div v-if="currentScope == 'social'" class="filter-controls my-2">
            <SocialFilterDisplay
              v-if="socialFilter && haveAccess"
              v-model="socialFilter"
              :viewerLocation="viewerProfile?.location"
              @prefs:toggle="showPrefsModal = true"
            />
          </div>
          <div v-if="currentScope == 'dating'" class="filter-controls my-2">
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
              <PlaceholdersGrid :howMany="6" :isAnimated="true" />
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
        <template v-else-if="isInitialized">
          <div class="overflow-auto hide-scrollbar pb-5" ref="scrollContainer">
            <MiddleColumn>
              <ProfileCardGrid
                :profiles="profileList"
                :showTags="true"
                :showLocation="true"
                @profile:select="handleCardClick"
              />
              <div ref="loadMoreTrigger" class="py-3"></div>
            </MiddleColumn>
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
.filter-controls {
  font-size: 0.75rem;
}
</style>
