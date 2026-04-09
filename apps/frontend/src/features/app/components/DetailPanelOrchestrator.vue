<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCaretLeft } from '@fortawesome/free-solid-svg-icons'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import PanelContentWrapper from './PanelContentWrapper.vue'

defineOptions({ name: 'DetailPanelOrchestrator' })

const { isOpen, currentComponent, currentProps, close, notifyHidden } = useDetailPanel()
</script>

<template>
  <BOffcanvas
    v-model="isOpen"
    placement="start"
    no-header
    no-backdrop
    class="detail-panel"
    body-class="p-0 overflow-hidden"
    @hidden="notifyHidden"
  >
    <div>
      <button
        class="drawer-close-tab"
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
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.offcanvas-body {
  // border-right: none !important;
}

.detail-panel {

  @include media-breakpoint-up(md) {
    width: 33vw;
    min-width: 320px;
  }

  @include media-breakpoint-down(sm) {
    width: 100vw;
  }
}

.drawer-close-tab {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateX(100%) translateY(-50%);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-size: 0.625rem;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    width: 1px;
    height: 100vh;
    // border-right: 1px solid  rgba(0, 0, 0, 0.1);
    box-shadow: 0px 0 3px rgba(0, 0, 0, 0.5);
    clip-path: inset(0 -10px 0 0);
    pointer-events: none;
  }

}
</style>
