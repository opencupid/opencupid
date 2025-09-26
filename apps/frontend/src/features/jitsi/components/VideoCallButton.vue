<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import IconVideo from '@/assets/icons/interface/video-camera.svg'
import JitsiModalBVN from './JitsiModalBVN.vue'
import { useJitsiStore } from '../stores/jitsi'

const props = defineProps<{ targetProfileId: string; persist?: boolean }>()
const show = ref(false)
const store = useJitsiStore()
const auth = useAuthStore()

async function start() {
  const myId = auth.profileId || ''
  const room = store.makePublicRoomName(myId, props.targetProfileId)
  if (props.persist !== false) {
    await store.createMeeting({ room, targetProfileId: props.targetProfileId })
  } else {
    store.currentMeeting = { id: '', room }
  }
  show.value = true
}
</script>

<template>
  <div class="d-inline">
    <BButton :pill="true" class="btn-overlay" @click="start">
      <IconVideo class="svg-icon-lg p-0" />
    </BButton>
    <JitsiModalBVN v-model="show" />
  </div>
</template>
