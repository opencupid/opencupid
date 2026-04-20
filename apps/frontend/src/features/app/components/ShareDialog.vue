<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { inject, type Ref, computed, ref, toRef } from 'vue'

import { refDebounced, useShare } from '@vueuse/core'

import ShareDialogContent from './ShareDialogContent.vue'
import { useAppStore } from '@/features/app/stores/appStore'
import { detectMobile } from '@/lib/mobile-detect'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const { share, isSupported } = useShare()
const { t } = useI18n()

const props = defineProps<{ trigger: boolean }>()
const appStore = useAppStore()

// Show once the trigger has been stable-true for 5s. BOffcanvas writes
// back on user close; we route that write into `shareCtaDismissed` so
// we don't prompt again this session.
const triggerDelayed = refDebounced(toRef(props, 'trigger'), 5000)
const showModal = computed({
  get: () => props.trigger && triggerDelayed.value && !appStore.shareCtaDismissed,
  set: (open) => {
    if (!open) appStore.shareCtaDismissed = true
  },
})

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')

// Web Share API is unreliable on desktop browsers (Edge silently drops the sheet).
// Only use it on mobile where it reliably opens a native share sheet.
const isMobile = computed(() => detectMobile())
const useWebShare = computed(() => isSupported.value && isMobile.value)
const expanded = ref(false)

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
    // Share was blocked or failed — fall back to the expanded modal view
    expanded.value = true
  }
}
</script>

<template>
  <BOffcanvas
    v-model="showModal"
    placement="bottom"
    class="share-offcanvas col-12 col-md-6 offset-md-3 col-lg-4 offset-lg-4 shadow-lg"
    :class="{ 'share-offcanvas--expanded': expanded }"
    body-class="py-0 px-3 bg-light"
    header-class="bg-light"
    no-backdrop
    :focus="false"
  >
    <div
      class="mx-2 mb-3 text-center"
      v-if="!expanded"
    >
      <slot />
    </div>

    <div class="d-flex flex-column justify-content-center align-items-center mb-3">
      <BButton
        v-if="useWebShare"
        variant="primary"
        size="md"
        @click="handleWebShare"
      >
        {{ t('profiles.browse.invite_button') }}
      </BButton>

      <div v-else>
        <BButton
          variant="primary"
          size="md"
          @click="expanded = true"
          v-if="!expanded"
        >
          {{ t('profiles.browse.invite_button') }}
        </BButton>

        <ShareDialogContent v-else />
      </div>
    </div>
  </BOffcanvas>
</template>

<style lang="scss">
// Not scoped: BOffcanvas teleports to document.body, so scoped
// [data-v-*] attribute selectors would never match.
.share-offcanvas {
  --bs-offcanvas-height: auto;
  max-height: 80dvh;
  transition: height 0.3s ease-in-out;

  &--expanded {
    --bs-offcanvas-height: 12rem;
  }
}
</style>
