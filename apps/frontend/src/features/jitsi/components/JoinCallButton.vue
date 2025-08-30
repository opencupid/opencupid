<script setup lang="ts">
import { ref } from 'vue'
import IconVideo from '@/assets/icons/interface/video-camera.svg'
import JitsiModalBVN from './JitsiModalBVN.vue'
import { useJitsiStore } from '../stores/jitsi'

const props = defineProps<{ withProfileId: string }>()
const store = useJitsiStore()
const show = ref(false)

async function join() {
  const meeting = await store.fetchLatest(props.withProfileId)
  if (meeting) {
    show.value = true
  } else {
    console.info('No ongoing meeting')
  }
}
</script>

<template>
  <div class="d-inline">
    <BButton :pill="true" class="btn-overlay" @click="join">
      <IconVideo class="svg-icon-lg p-0" />
    </BButton>
    <JitsiModalBVN v-model="show" />
  </div>
</template>
