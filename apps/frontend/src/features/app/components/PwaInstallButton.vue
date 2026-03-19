<script setup lang="ts">
import { useAppStore } from '../stores/appStore'
import { promptInstall } from '../composables/usePwaInstall'

const appStore = useAppStore()
</script>

<template>
  <div v-if="appStore.canInstallPwa">
    <hr class="mb-md-4" />
    <div class="d-flex flex-wrap align-items-center gap-2">
      <div class="flex-grow-1">
        <span class="me-2 form-hint">{{ $t('uicomponents.install_banner.message') }}</span>
      </div>
      <div>
        <BButton
          variant="success"
          size="sm"
          @click="promptInstall"
        >
          {{ $t('uicomponents.install_banner.install') }}
        </BButton>
      </div>
    </div>
  </div>
</template>
