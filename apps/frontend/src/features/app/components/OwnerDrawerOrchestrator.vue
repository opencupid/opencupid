<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useAppShellState } from '@/features/app/composables/useAppShellState'

import ProfilePanel from '@/features/myprofile/components/ProfilePanel.vue'
import InboxPanel from '@/features/messaging/components/InboxPanel.vue'

defineOptions({ name: 'OwnerDrawerOrchestrator' })

/**
 * Right-side drawer orchestrator. Mirrors the DetailPanelOrchestrator pattern:
 * a single persistent <BOffcanvas> lives here so the DOM is stable across
 * open/close cycles, and content is unmounted only AFTER the slide-out
 * animation completes (BOffcanvas @hidden event), preventing the content
 * flash that v-if-driven content suffers from.
 *
 * Unlike DetailPanel (imperative `panel.show(...)` API), this orchestrator's
 * content is route-driven via useAppShellState().drawerType. The same
 * two-phase teardown principle applies though: `displayedType` lags
 * `drawerType` so content stays mounted during the close animation.
 */

const { drawerType } = useAppShellState()
const router = useRouter()
const route = useRoute()

const isOpen = ref(false)
// Lags `drawerType`. Cleared only after BOffcanvas finishes its slide-out,
// so the panel never animates against empty content.
const displayedType = ref<'profile' | 'inbox' | null>(null)

// Route → drawer state
watch(
  drawerType,
  (type) => {
    if (type) {
      // Open or swap content in place
      displayedType.value = type
      isOpen.value = true
    } else {
      // Begin slide-out; keep displayedType set so content stays visible
      isOpen.value = false
    }
  },
  { immediate: true }
)

// Bootstrap close gesture (ESC / backdrop / swipe) → navigate back to Browse
watch(isOpen, (open) => {
  if (!open && route.name !== 'Browse') {
    router.replace({ name: 'Browse' })
  }
})

// BOffcanvas finished its close animation → safe to unmount content
function onHidden() {
  displayedType.value = null
}
</script>

<template>
  <BOffcanvas
    v-model="isOpen"
    placement="end"
    no-header
    class="owner-drawer h-100 overflow-hidden"
    body-class="p-0 position-relative overflow-hidden d-flex flex-column"
    aria-labelledby="ownerDrawerLabel"
    @hidden="onHidden"
    :focus="false"
  >
    <ProfilePanel v-if="displayedType === 'profile'" />
    <InboxPanel v-else-if="displayedType === 'inbox'" />
  </BOffcanvas>
</template>
