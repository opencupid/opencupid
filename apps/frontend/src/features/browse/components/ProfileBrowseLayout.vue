<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import FluidColumn from '@/features/shared/ui/FluidColumn.vue'

import type { OwnerProfile } from '@zod/profile/profile.dto'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  profileList: { id: string }[]
  isLoading: boolean
  isInitialized: boolean
  haveResults: boolean
}>()

const emit = defineEmits<{
  'profile:open': [profileId: string]
  'profile:hidden': [profileId: string]
  'prefs:update': []
}>()

const { t } = useI18n()
const toast = useToast()

const showPrefsModal = ref(false)

// TODO(#847): Replace toast with proper no-results UX — see issue for design discussion
// watch(
//   () => props.haveResults,
//   (hasResults) => {
//     if (!hasResults && props.isInitialized) {
//       toast.info(t('profiles.browse.no_results_cta_title'))
//     }
//   }
// )

provide(
  'viewerProfile',
  computed(() => props.viewerProfile)
)

const handleCardClick = (profileId: string) => {
  emit('profile:open', profileId)
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div class="list-view d-flex flex-column justify-content-start">
      <FluidColumn class="my-2">
        <div class="subnav-bar d-flex align-items-center gap-2 px-2 py-1  rounded">
          <slot
            name="filter-bar"
            :showPrefsModal="showPrefsModal"
          />
        </div>
      </FluidColumn>

      <div class="overflow-auto hide-scrollbar flex-grow-1 position-relative">
        <slot
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
  z-index: 1030; // above Leaflet controls (z-index: 1000), below Bootstrap modals (1040+)
  // box-shadow: var(--shadow-xs);
}
</style>
