<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ShareDialog from './ShareDialog.vue'
const { t } = useI18n()
const showModal = ref(false)
</script>

<template>
  <div
    class="d-flex flex-column align-items-center shadow-lg bg-theme user-select-none justify-content-center px-4 py-4 text-center"
  >
    <p>{{ t('profiles.invite_message') }}</p>
    <BButton class="mb-3" variant="primary" @click="showModal = true">
      {{ t('profiles.invite_button') }}
    </BButton>
  </div>
  <BModal
    centered
    :show="showModal"
    :no-footer="true"
    :no-header="false"
    fullscreen="sm"
    title="Spread the word"
    :backdrop-first="false"
    no-animation
  >
   <div class="d-flex flex-column align-items-center justify-content-center h-100">
      <ShareDialog />
    </div>
  </BModal>
</template>

<style scoped></style>
