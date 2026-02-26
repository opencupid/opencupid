<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useInfiniteScroll } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import PublicProfileComponent from '@/features/publicprofile/components/PublicProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import PlaceholdersGrid from '../components/PlaceholdersGrid.vue'

import type { OwnerProfile, ProfileScope } from '@zod/profile/profile.dto'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  profileList: { id: string }[]
  selectedProfileId: string | null
  isLoading: boolean
  isLoadingMore: boolean
  isInitialized: boolean
  hasMoreProfiles: boolean
  haveAccess: boolean
  haveResults: boolean
  currentScope: ProfileScope
}>()

const emit = defineEmits<{
  'load-more': []
  'profile:open': [profileId: string]
  'profile:close': []
  'profile:hidden': [profileId: string]
  'prefs:update': []
}>()

const router = useRouter()
const { t } = useI18n()

const showPrefsModal = ref(false)
const canGoBack = ref(false)

provide(
  'viewerProfile',
  computed(() => props.viewerProfile)
)

const isDetailView = computed(() => !!props.selectedProfileId)

const handleCardClick = (profileId: string) => {
  canGoBack.value = true
  emit('profile:open', profileId)
}

const handleCloseProfileView = () => {
  emit('profile:close')
}

const handleOpenConversation = (conversationId: string) => {
  router.push({ name: 'Messaging', params: { conversationId } })
}

const handleHidden = (id: string) => {
  emit('profile:hidden', id)
  canGoBack.value = false
}

const handleEditProfileIntent = () => {
  router.push({ name: 'EditProfile', state: { hint: 'scope' } })
}

// Infinite scroll
const scrollContainer = ref<HTMLElement>()

useInfiniteScroll(
  scrollContainer,
  async () => {
    if (props.isLoadingMore || !props.hasMoreProfiles || !props.isInitialized) {
      return
    }
    emit('load-more')
  },
  {
    distance: 300,
    canLoadMore: () => props.hasMoreProfiles && !props.isLoadingMore && props.isInitialized,
  }
)
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <!-- Detail view overlay -->
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
      <FluidColumn class="my-2">
        <div
          class="subnav-bar d-flex align-items-center gap-2 px-2 py-1 bg-light rounded"
          :class="currentScope"
          @click="showPrefsModal = true"
        >
          <slot
            name="filter-bar"
            :showPrefsModal="showPrefsModal"
          />
        </div>
      </FluidColumn>

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
            <FluidColumn class="overflow-hidden">
              <PlaceholdersGrid
                :howMany="6"
                :isAnimated="true"
              />
            </FluidColumn>
          </BOverlay>
        </template>

        <template v-if="isInitialized && !haveAccess">
          <BContainer class="flex-grow-1 d-flex align-items-center justify-content-center">
            <MiddleColumn>
              <NoAccessCTA
                :scope="currentScope"
                @edit:profile="handleEditProfileIntent"
              />
            </MiddleColumn>
          </BContainer>
        </template>

        <template v-if="isInitialized && !haveResults && haveAccess">
          <BContainer class="flex-grow-1 d-flex align-items-center justify-content-center">
            <MiddleColumn>
              <slot name="no-results" />
              <NoResultsCTA />
            </MiddleColumn>
          </BContainer>
        </template>

        <template v-else-if="isInitialized && haveResults">
          <div
            ref="scrollContainer"
            class="overflow-auto hide-scrollbar flex-grow-1"
          >
            <slot
              name="results"
              :onProfileSelect="handleCardClick"
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
              <span class="ms-2 text-muted">{{ $t('profiles.browse.loading_more_profiles') }}</span>
            </div>
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
        @ok="$emit('prefs:update')"
      >
        <slot name="prefs-modal" />
      </BModal>
    </div>
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';
@import '@/css/theme.scss';

.detail-view {
  z-index: 1050;
  height: 100dvh;
  inset: 0;

  @include media-breakpoint-up(sm) {
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
}

.subnav-bar {
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow: var(--shadow-1), var(--shadow-1);
  }

  &.social {
    background-color: transparentize($social, 0.95) !important;

    &:hover {
      background-color: transparentize($social, 0.88) !important;
    }
  }

  &.dating {
    background-color: transparentize($dating, 0.95) !important;

    &:hover {
      background-color: transparentize($dating, 0.88) !important;
    }
  }
}
</style>
