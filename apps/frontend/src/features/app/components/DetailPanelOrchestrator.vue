<script setup lang="ts">
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
    class="detail-panel"
    body-class="p-0"
    @hidden="notifyHidden"
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
  </BOffcanvas>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.detail-panel {
  @include media-breakpoint-up(md) {
    width: 33vw;
    min-width: 320px;
  }

  @include media-breakpoint-down(sm) {
    width: 100vw;
  }
}
</style>
