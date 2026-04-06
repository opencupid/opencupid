<script setup lang="ts">
import { useAppShellState } from '@/features/app/composables/useAppShellState'

import OwnerDrawer from './OwnerDrawer.vue'
import ProfilePanel from '@/features/myprofile/components/ProfilePanel.vue'
import InboxPanel from '@/features/messaging/components/InboxPanel.vue'

defineOptions({ name: 'OwnerDrawerOrchestrator' })

const { drawerType } = useAppShellState()
</script>

<template>
  <OwnerDrawer>
    <ProfilePanel v-if="drawerType === 'profile'" />
    <InboxPanel v-else-if="drawerType === 'inbox'" />
  </OwnerDrawer>
</template>
