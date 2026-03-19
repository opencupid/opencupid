<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ShareDialog from './ShareDialog.vue'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const showModal = ref(false)
</script>

<template>
  <div class="d-flex flex-wrap align-items-center justify-content-center gap-2 user-select-none">
    <!-- This community is still growing -->
    <div class="lh-sm small">
      {{ t('profiles.browse.no_results_cta_title') }}
    </div>

    <!-- Invite friends -->
    <BButton
      variant="outline-primary"
      size="sm"
      @click="showModal = true"
    >
      {{ t('profiles.browse.invite_button') }}
    </BButton>
  </div>
  <ShareDialog v-model="showModal" />
</template>

<style scoped lang="scss">
.small,button {
  font-size: 0.725rem;
}
</style>
