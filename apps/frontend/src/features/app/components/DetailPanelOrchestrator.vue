<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCaretLeft } from '@fortawesome/free-solid-svg-icons'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import PanelContentWrapper from './PanelContentWrapper.vue'
import { SwipeModal } from '@takuma-ru/vue-swipe-modal'

defineOptions({ name: 'DetailPanelOrchestrator' })

const { isOpen, currentComponent, currentProps, close, notifyHidden } = useDetailPanel()
const isMdUp = useMediaQuery('(min-width: 768px)')
const placement = computed(() => (isMdUp.value ? 'start' : 'bottom'))
</script>

<template>
  <BOffcanvas
    v-if="isMdUp"
    v-model="isOpen"
    :placement="placement"
    no-header
    class="detail-panel shadow-lg"
    body-class="p-0 overflow-hidden"
    @hidden="notifyHidden"
  >
    <div>
      <button
        class="drawer-close-tab d-none d-md-flex position-absolute align-items-center justify-content-center"
        @click="close"
      >
        <FontAwesomeIcon :icon="faCaretLeft" />
      </button>
    </div>
    <PanelContentWrapper
      v-if="currentComponent"
      :close="close"
    >
      <component
        :is="currentComponent"
        v-bind="currentProps"
      />
    </PanelContentWrapper>
  </BOffcanvas>

  <SwipeModal
    v-model="isOpen"
    :snap-point="'75vh'"
    :is-backdrop="false"
    v-else
  >
    <PanelContentWrapper
      v-if="currentComponent"
      :close="close"
    >
      <component
        :is="currentComponent"
        v-bind="currentProps"
      />
    </PanelContentWrapper>
  </SwipeModal>
</template>

<style lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.detail-panel {
  border-right: none;

  @include media-breakpoint-up(md) {
    // width: 33vw;
    // min-width: 320px;
  }

  @include media-breakpoint-down(sm) {
    width: 100vw;
  }
}

.detail-panel.offcanvas-bottom {
  height: 50vh;
}

// Override vue-swipe-modal scoped dark defaults
.modal-style {
  background-color: $white !important;
  color: $body-color !important;
}

// Keep SwipeModal below Bootstrap modals. Using :is-backdrop="false" makes
// the library call dialog.show() instead of showModal(), which keeps it in
// the normal stacking context rather than the browser's top layer.
.swipe-modal {
  z-index: $zindex-offcanvas !important;
}

.swipe-modal::backdrop {
  background-color: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: none !important;
}

.drawer-close-tab {
  top: 50%;
  right: 0;
  transform: translateX(100%) translateY(-50%);
  z-index: 1050;
  width: 1.5rem;
  height: 3rem;
  padding: 0;

  background: $white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-left: none;
  box-shadow: 1px 0px 2px rgba(0, 0, 0, 0.1);
  clip-path: inset(-1px -10px -1px 0);
  border-radius: 0 0.375rem 0.375rem 0;
  color: $gray-600;
  cursor: pointer;
  font-size: 0.825rem;

  &:hover {
    background-color: whitesmoke;
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    width: 1px;
    height: 100vh;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0px 0 3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
}
</style>
