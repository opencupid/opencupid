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
    <!-- This community is still growing -->
    <h5>{{ t('profiles.browse.no_results_cta_title') }}</h5>

    <!-- You can help by inviting your friends to join -->
    <p class="text-muted">{{ t('profiles.browse.no_results_cta_description') }}</p>

    <!-- Invite friends -->
    <BButton class="mb-3" variant="primary" @click="showModal = true">
      {{ t('profiles.browse.invite_button') }}
    </BButton>
  </div>
  <ShareDialog v-model="showModal" />
</template>
