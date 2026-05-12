<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import IconShare from '@/assets/icons/interface/send-3.svg'
import ShareSheet, { type SharePayload } from '@/features/app/components/ShareSheet.vue'

defineProps<{
  payload: SharePayload
}>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <BButton
    @click.stop="open = true"
    variant="link-secondary"
    size="sm"
    :title="t('userContent.actions.share')"
    :aria-label="t('userContent.actions.share')"
  >
    <IconShare class="svg-icon" />
  </BButton>
  <ShareSheet
    v-model:open="open"
    :payload="payload"
  />
</template>
