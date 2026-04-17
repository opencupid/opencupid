<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCaretLeft } from '@fortawesome/free-solid-svg-icons'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import PanelContentWrapper from './PanelContentWrapper.vue'
import BottomSheet from './BottomSheet.vue'
import { isMdUp } from '@/lib/responsive'

defineOptions({ name: 'DetailPanelOrchestrator' })

const { isOpen, currentComponent, currentProps, close, notifyHidden } = useDetailPanel()
</script>

<template>
  <BOffcanvas
    v-if="isMdUp"
    v-model="isOpen"
    placement="start"
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

  <BottomSheet
    v-else
    v-model="isOpen"
    @hidden="notifyHidden"
  >
    <component
      :is="currentComponent"
      v-bind="currentProps"
    />
  </BottomSheet>
</template>

<style lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

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
