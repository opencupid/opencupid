<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BOverlay } from 'bootstrap-vue-next'

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
      <div class="text-center text-dark">
        <div>
          <BSpinner variant="danger" type="grow" small></BSpinner>
        </div>
        <h3>{{ t('uicomponents.connection_error.title') }}</h3>
        <p class="fs-6">
          {{ t('uicomponents.connection_error.description') }}
        </p>
        <img src="/images/api-error.png" alt="" />
      </div>
    </template>
  </BOverlay>
</template>

<style scoped>
img {
  width: 75%;
}
</style>
