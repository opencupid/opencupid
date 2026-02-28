<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import PlaceholdersGrid from '../components/PlaceholdersGrid.vue'

import type { OwnerProfile, ProfileScope } from '@zod/profile/profile.dto'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  profileList: { id: string }[]
  isLoading: boolean
  isInitialized: boolean
  haveAccess: boolean
  haveResults: boolean
  currentScope: ProfileScope
}>()

const emit = defineEmits<{
  'profile:open': [profileId: string]
  'profile:hidden': [profileId: string]
  'prefs:update': []
}>()

const router = useRouter()
const { t } = useI18n()

const showPrefsModal = ref(false)

provide(
  'viewerProfile',
  computed(() => props.viewerProfile)
)

const handleCardClick = (profileId: string) => {
  emit('profile:open', profileId)
}

const handleEditProfileIntent = () => {
  router.push({ name: 'EditProfile', state: { hint: 'scope' } })
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div
      class="list-view d-flex flex-column justify-content-start"
      :class="[currentScope]"
    >
      <FluidColumn class="my-2">
        <div
          class="subnav-bar d-flex align-items-center gap-2 px-2 py-1 bg-light rounded"
          :class="currentScope"
          @click="currentScope !== 'social' && (showPrefsModal = true)"
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
          <div class="overflow-auto hide-scrollbar flex-grow-1">
            <slot
              name="results"
              :onProfileSelect="handleCardClick"
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

.list-view {
  height: calc(100vh - $navbar-height);
}

main {
  width: 100%;
}

.subnav-bar {
  position: relative;
  z-index: 800; // above Leaflet map panes (max ~700)
  box-shadow: var(--shadow-xs);
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    // box-shadow: var(--shadow-1), var(--shadow-1);
  }

  // &.social {
  //   background-color: transparentize($social, 0.95) !important;
  //   cursor: default;

  //   &:hover {
  //     background-color: transparentize($social, 0.95) !important;
  //     box-shadow: var(--shadow-xs);
  //   }
  // }

  // &.dating {
  //   background-color: transparentize($dating, 0.95) !important;

  //   &:hover {
  //     background-color: transparentize($dating, 0.88) !important;
  //   }
  // }
}
</style>
