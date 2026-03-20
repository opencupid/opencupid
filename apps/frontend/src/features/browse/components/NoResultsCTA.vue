<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ShareDialog from './ShareDialog.vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import { useShare } from '@vueuse/core'

const { share, isSupported } = useShare()

const { t } = useI18n()
const showModal = ref(false)
const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const handleWebShare = async () => {
  try {
    await share({
      title: t('uicomponents.share_dialog.share_title', { siteName: __APP_CONFIG__.SITE_NAME }),
      text: t('uicomponents.share_dialog.share_text', {
        siteName: __APP_CONFIG__.SITE_NAME,
        publicName: viewerProfile?.value?.publicName || '',
      }),
      url: window.location.origin,
    })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    // Share was blocked or failed (e.g. NotAllowedError in Edge desktop) — fall back to modal
    showModal.value = true
  }
}
</script>

<template>
  <div class="d-flex flex-wrap align-items-center justify-content-center gap-2 user-select-none">
    <!-- This community is still growing -->
    <div class="lh-sm small">
      {{ t('profiles.browse.no_results_cta_title') }}
    </div>

    <BButton
      v-if="isSupported"
      variant="outline-primary"
      size="sm"
      @click="handleWebShare"
    >
      {{ t('profiles.browse.invite_button') }}
    </BButton>

    <!-- Invite friends -->
    <BButton
      v-else
      variant="outline-primary"
      size="sm"
      @click="showModal = true"
    >
      {{ t('profiles.browse.invite_button') }}
    </BButton>
  </div>
  <ShareDialog v-model="showModal" />
</template>

<style scoped lang="scss">
.small,
button {
  font-size: 0.725rem;
}
</style>
