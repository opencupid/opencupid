<script lang="ts" setup>
import { computed, toRef } from 'vue'

import { refDebounced } from '@vueuse/core'

import ShareSheet, { type SharePayload } from './ShareSheet.vue'
import { useAppStore } from '@/features/app/stores/appStore'

/**
 * Passive invite-CTA wrapper around ShareSheet. Auto-shows the share sheet
 * once `trigger` has been stable-true for 5 seconds AND the user has not
 * dismissed the CTA in the current session. Dismissing the sheet sets
 * `appStore.shareCtaDismissed` so it won't reappear.
 */
const props = defineProps<{
  trigger: boolean
  payload: SharePayload
}>()
const appStore = useAppStore()

const triggerDelayed = refDebounced(toRef(props, 'trigger'), 5000)
const showModal = computed({
  get: () => props.trigger && triggerDelayed.value && !appStore.shareCtaDismissed,
  set: (open) => {
    if (!open) appStore.shareCtaDismissed = true
  },
})
</script>

<template>
  <ShareSheet
    v-model:open="showModal"
    :payload="payload"
  >
    <slot />
  </ShareSheet>
</template>
