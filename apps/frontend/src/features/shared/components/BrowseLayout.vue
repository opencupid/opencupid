<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'

defineProps<{
  isLoading: boolean
  isInitialized: boolean
  haveResults: boolean
  prefsModalTitle?: string
}>()

defineEmits<{
  'prefs:update': []
}>()

const { t } = useI18n()

const showPrefsModal = ref(false)
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div class="list-view d-flex flex-column justify-content-start">
      <FluidColumn class="my-2">
        <div class="subnav-bar d-flex align-items-center gap-2 px-2 py-1 rounded">
          <slot
            name="filter-bar"
            :showPrefsModal="showPrefsModal"
          />
        </div>
      </FluidColumn>

      <div class="overflow-auto hide-scrollbar flex-grow-1 position-relative">
        <slot name="results" />
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

    <slot name="floating" />
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
  z-index: 1030;
}
</style>
