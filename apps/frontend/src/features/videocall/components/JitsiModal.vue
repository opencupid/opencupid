<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useCallStore } from '../stores/callStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

const callStore = useCallStore()
const ownerProfileStore = useOwnerProfileStore()
const jitsiContainer = ref<HTMLDivElement | null>(null)
let jitsiApi: any = null
let scriptLoaded = false

const isActive = computed(() => callStore.status === 'active')

function loadJitsiScript(): Promise<void> {
  if (scriptLoaded || (window as any).JitsiMeetExternalAPI) {
    scriptLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://${__APP_CONFIG__.JITSI_DOMAIN}/external_api.js`
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function destroyJitsi() {
  if (jitsiApi) {
    jitsiApi.dispose()
    jitsiApi = null
  }
}

async function startJitsi() {
  if (!jitsiContainer.value || !callStore.roomName) return

  try {
    await loadJitsiScript()
  } catch {
    console.error('[Jitsi] Failed to load external API script')
    callStore.endCall()
    return
  }

  const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI
  if (!JitsiMeetExternalAPI) return

  jitsiApi = new JitsiMeetExternalAPI(__APP_CONFIG__.JITSI_DOMAIN, {
    roomName: callStore.roomName,
    parentNode: jitsiContainer.value,
    width: '100%',
    height: '100%',
    userInfo: {
      displayName: ownerProfileStore.profile?.publicName || '',
    },
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      prejoinConfig: { enabled: false },
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
    },
  })

  jitsiApi.addListener('readyToClose', () => {
    callStore.endCall()
  })

  // Auto-close when local user leaves the conference (e.g. clicks hangup)
  jitsiApi.addListener('videoConferenceLeft', () => {
    callStore.endCall()
  })

  // Auto-close when the remote participant leaves (1-1 call)
  jitsiApi.addListener('participantLeft', () => {
    const count = jitsiApi?.getNumberOfParticipants?.() ?? 0
    if (count <= 1) {
      callStore.endCall()
    }
  })
}

watch(isActive, async (active) => {
  if (active) {
    await nextTick()
    startJitsi()
  } else {
    destroyJitsi()
  }
})

onUnmounted(() => {
  destroyJitsi()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isActive"
      class="jitsi-modal-overlay"
    >
      <div class="jitsi-modal-content">
        <div
          ref="jitsiContainer"
          class="jitsi-container"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.jitsi-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1060;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}
.jitsi-modal-content {
  width: 95vw;
  height: 90vh;
  max-width: 1200px;
}
.jitsi-container {
  width: 100%;
  height: 100%;
}
</style>
