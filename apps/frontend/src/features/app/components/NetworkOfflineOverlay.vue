<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BOverlay } from 'bootstrap-vue-next'
import IconSignal from '@/assets/icons/interface/signal.svg'

defineProps<{
  show: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <BOverlay
    :show="show"
    no-wrap
    :z-index="1200"
    variant="light"
    :opacity="0.9"
  >
    <template #overlay>
      <div
        class="network-offline-overlay-content text-center text-dark d-flex flex-column align-items-center justify-content-center"
      >
        <IconSignal class="signal-icon text-secondary mb-3" />
        <h3>{{ t('uicomponents.network_offline.title') }}</h3>
        <p class="fs-6">
          {{ t('uicomponents.network_offline.description') }}
        </p>
        <BSpinner
          variant="secondary"
          small
        ></BSpinner>
      </div>
    </template>
  </BOverlay>
</template>

<style scoped>
.network-offline-overlay-content {
  width: min(80vw, 400px);
  margin-inline: auto;
  padding-block: 15vh 5vh;
}

.signal-icon {
  width: 4rem;
  height: 4rem;
  opacity: 0.5;
}
</style>
