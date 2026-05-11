<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useShare } from '@vueuse/core'

import ShareDialogContent from './ShareDialogContent.vue'
import { detectMobile } from '@/lib/mobile-detect'

const { share, isSupported } = useShare()
const { t } = useI18n()

/**
 * The content a share operation publishes. Mirrors the shape of the Web
 * Share API's ShareData but scoped to this app's invocations.
 */
export interface SharePayload {
  title: string
  text: string
  url: string
}

defineProps<{
  payload: SharePayload
}>()

// Open state is owned by the caller; the sheet renders props down, events up.
const open = defineModel<boolean>('open', { required: true })

// Web Share API is unreliable on desktop browsers (Edge silently drops the sheet).
// Only use it on mobile where it reliably opens a native share sheet.
const isMobile = computed(() => detectMobile())
const useWebShare = computed(() => isSupported.value && isMobile.value)

// Flipped when navigator.share() fails on mobile, promoting the offcanvas
// to render the desktop fallback (#desktop slot / default ShareDialogContent).
const expanded = ref(false)

const handleWebShare = async (data: SharePayload) => {
  try {
    await share(data)
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    // Share was blocked or failed — fall back to the desktop content.
    expanded.value = true
  }
}
</script>

<template>
  <BOffcanvas
    v-model="open"
    placement="bottom"
    class="share-offcanvas col-12 col-md-6 offset-md-3 col-lg-4 offset-lg-4 shadow-lg"
    body-class="py-0 px-3 bg-light"
    header-class="bg-light"
    no-backdrop
    :focus="false"
  >
    <div
      class="mx-2 mb-3 text-center"
      v-if="$slots.default"
    >
      <slot />
    </div>

    <div class="d-flex flex-column justify-content-center align-items-center mb-3">
      <BButton
        v-if="useWebShare && !expanded"
        variant="primary"
        size="md"
        @click="handleWebShare(payload)"
      >
        {{ t('profiles.browse.invite_button') }}
      </BButton>

      <div
        v-else
        class="w-100"
      >
        <slot name="desktop">
          <ShareDialogContent :payload="payload" />
        </slot>
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
}
</style>
