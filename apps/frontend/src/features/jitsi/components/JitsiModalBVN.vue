<script setup lang="ts">
import { computed, watch } from 'vue'
import { BModal } from 'bootstrap-vue-next'
import { useJitsiStore } from '../stores/jitsi'

const model = defineModel<boolean>({ default: false })
const store = useJitsiStore()
const room = computed(() => store.currentMeeting?.room)

watch(model, value => {
  if (!value && store.currentMeeting) {
    store.endMeeting(store.currentMeeting.id)
  }
})
</script>

<template>
  <BModal v-model="model" size="xl" hide-footer no-close-on-backdrop no-close-on-esc title="Video call">
    <iframe
      v-if="room"
      :src="`https://meet.jit.si/${room}`"
      allow="camera; microphone; fullscreen"
      style="width: 100%; height: 80vh; border: 0"
    />
  </BModal>
</template>
