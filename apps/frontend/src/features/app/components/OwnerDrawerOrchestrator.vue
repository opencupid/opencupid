<script setup lang="ts">
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'

import OwnerDrawer from './OwnerDrawer.vue'
import ProfilePanel from '@/features/myprofile/components/ProfilePanel.vue'
import InboxPanel from '@/features/messaging/components/InboxPanel.vue'

defineOptions({ name: 'OwnerDrawerOrchestrator' })

const props = defineProps<{
  panel: 'profile' | 'inbox'
  conversationId?: string
}>()

const offcanvasState = useOffcanvasState()
</script>

<template>
  <OwnerDrawer>
    <ProfilePanel
      v-if="panel === 'profile'"
      @close="offcanvasState.close()"
    />
    <InboxPanel
      v-else-if="panel === 'inbox'"
      :conversation-id="conversationId"
      @close="offcanvasState.close()"
    />
  </OwnerDrawer>
</template>
