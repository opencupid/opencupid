<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOpenreplayStore } from '../stores/openreplayStore'
import IconQuestion from '@/assets/icons/interface/question.svg'

const { t } = useI18n()
const openreplayStore = useOpenreplayStore()

const showModal = ref(false)
</script>

<template>
  <button
    type="button"
    class="btn btn-link link-secondary text-decoration-none text-nowrap"
    :title="t('openreplay.button_title')"
    @click="showModal = true"
  >
  Got stuck
    <IconQuestion class="svg-icon" />
  </button>

  <BModal
    v-model="showModal"
    centered
    :title="t('openreplay.modal_title')"
    :no-footer="true"
    fullscreen="sm"
    no-animation
    body-class="d-flex flex-column"
  >
    <p class="text-muted">
      {{ t('openreplay.modal_body') }}
    </p>

    <BFormCheckbox
      v-model="openreplayStore.enabled"
      switch
      size="lg"
    >
      {{ t('openreplay.switch_label') }}
    </BFormCheckbox>
  </BModal>
</template>
