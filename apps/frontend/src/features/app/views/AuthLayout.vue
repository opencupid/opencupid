<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import OwnerDrawerOrchestrator from '@/features/app/components/OwnerDrawerOrchestrator.vue'

defineOptions({ name: 'AuthLayout' })

const route = useRoute()
const offcanvasState = useOffcanvasState()

// Deep-link support: ?panel=profile|inbox&conversation=<id>
watch(
  () => route.query,
  (query) => {
    const panel = query.panel as 'profile' | 'inbox' | undefined
    if (panel === 'profile' || panel === 'inbox') {
      offcanvasState.openUser(panel, query.conversation as string | undefined)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="auth-layout d-flex vh-100 overflow-hidden">
    <!-- Named Teleport targets — claimed by child routes and OwnerDrawer -->
    <div id="app-sidebar" />
    <div id="app-detail" />

    <!-- Route content -->
    <div class="flex-grow-1 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['BrowseProfiles']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>

    <OwnerDrawerOrchestrator
      :panel="offcanvasState.userPanel.value"
      :conversation-id="offcanvasState.userConversationId.value"
    />
  </div>
</template>
