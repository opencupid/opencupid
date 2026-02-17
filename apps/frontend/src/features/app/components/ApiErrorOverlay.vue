<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BOverlay } from 'bootstrap-vue-next'
import ApiErrorImage from '@/assets/images/api-error.png?inline'

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
    spinner-variant="danger"
    spinner-type="grow"
    variant="warning"
    :opacity="0.9"
  >
    <template #overlay>
      <div class="api-error-overlay-content text-center text-dark d-flex flex-column">
        <div>
          <BSpinner variant="danger" type="grow" small></BSpinner>
        </div>
        <h3>{{ t('uicomponents.connection_error.title') }}</h3>
        <p class="fs-6">
          {{ t('uicomponents.connection_error.description') }}
        </p>
        <img :src="ApiErrorImage" alt="" class="" />
      </div>
    </template>
  </BOverlay>
</template>

<style scoped>
.api-error-overlay-content {
  width: 50vw;
  height: 50vw;
  margin-inline: auto;
  overflow: hidden;
}

img {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  object-fit: contain;   /* keep full image visible */
  object-position: center;
}
</style>
