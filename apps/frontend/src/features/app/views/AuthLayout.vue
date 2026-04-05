<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import OwnerDrawerOrchestrator from '@/features/app/components/OwnerDrawerOrchestrator.vue'

defineOptions({ name: 'AuthLayout' })

const route = useRoute()
const offcanvasState = useOffcanvasState()

watch(
  () => route.name,
  (name) => {
    if (name === 'Me')
      offcanvasState.openUser('profile')
    else if (name === 'Inbox')
      offcanvasState.openUser('inbox')
    else if (name === 'Conversation')
      offcanvasState.openUser('inbox', route.params.conversationId as string)
    else
      offcanvasState.close()
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
