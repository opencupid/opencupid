<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import FluidColumn from '@/features/shared/ui/FluidColumn.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import NoAccessCTA from '../components/NoAccessCTA.vue'
import MapPlaceholder from '../components/MapPlaceholder.vue'

import type { OwnerProfile } from '@zod/profile/profile.dto'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  profileList: { id: string }[]
  isLoading: boolean
  isInitialized: boolean
  haveAccess: boolean
  haveResults: boolean
}>()

const emit = defineEmits<{
  'profile:open': [profileId: string]
  'profile:hidden': [profileId: string]
  'prefs:update': []
}>()

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const showPrefsModal = ref(false)

// TODO(#847): Replace toast with proper no-results UX — see issue for design discussion
watch(
  () => props.haveResults,
  (hasResults) => {
    if (!hasResults && props.isInitialized && props.haveAccess) {
      toast.info(t('profiles.browse.no_results_cta_title'))
    }
  }
)

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
    <div class="list-view d-flex flex-column justify-content-start">
      <FluidColumn class="my-2">
        <div class="subnav-bar d-flex align-items-center gap-2 px-2 py-1 bg-light rounded">
          <slot
            name="filter-bar"
            :showPrefsModal="showPrefsModal"
          />
        </div>
      </FluidColumn>

      <div class="overflow-auto hide-scrollbar flex-grow-1 position-relative" :class="{loading:isLoading}">
    
        <!-- <template v-if="isInitialized && !haveAccess">
          <BContainer class="flex-grow-1 d-flex align-items-center justify-content-center">
            <MiddleColumn>
              <NoAccessCTA
                scope="social"
                @edit:profile="handleEditProfileIntent"
              />
            </MiddleColumn>
          </BContainer>
        </template> -->

        <slot
          v-if="haveAccess"
          name="results"
          :onProfileSelect="handleCardClick"
        />
      </div>

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
}
</style>
