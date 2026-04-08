<script setup lang="ts">
import { provide } from 'vue'
import { storeToRefs } from 'pinia'
import OwnerDrawerOrchestrator from '@/features/app/components/OwnerDrawerOrchestrator.vue'
import DetailPanelOrchestrator from '@/features/app/components/DetailPanelOrchestrator.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

defineOptions({ name: 'AuthLayout' })

const { profile } = storeToRefs(useOwnerProfileStore())
provide('viewerProfile', profile)
</script>

<template>
  <div class="auth-layout d-flex vh-100 overflow-hidden">
    <!-- Route content -->
    <div class="flex-grow-1 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['AppShell']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>

    <OwnerDrawerOrchestrator />
    <DetailPanelOrchestrator />
  </div>
</template>
