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
      <div
        class="api-error-overlay-content text-center text-dark d-flex flex-column align-items-center justify-content-center"
      >
        <div>
          <BSpinner
            variant="danger"
            type="grow"
            small
          ></BSpinner>
        </div>
        <h3>{{ t('uicomponents.connection_error.title') }}</h3>
        <p class="fs-6">
          {{ t('uicomponents.connection_error.description') }}
        </p>
        <img
          :src="ApiErrorImage"
          alt=""
        />
      </div>
    </template>
  </BOverlay>
</template>

<style scoped>
.api-error-overlay-content {
  width: min(80vw, 400px);
  margin-inline: auto;
  padding-block: 15vh 5vh;
}

img {
  width: 100%;
  max-width: 280px;
  object-fit: contain;
}
</style>
