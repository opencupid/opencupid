<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { UseClipboard } from '@vueuse/components'
import { useQRCode } from '@vueuse/integrations/useQRCode'
import IconCopy from '@/assets/icons/interface/copy.svg'

const { t } = useI18n()

const shareUrl = window.location.origin
const qrcode = useQRCode(shareUrl, {
  errorCorrectionLevel: 'H',
  margin: 3,
  width: 300,
})
</script>

<template>
  <div class="text-center">
    <div class="mb-2">
      <code class="text-truncate">{{ shareUrl }}</code>
    </div>
    <UseClipboard
      v-slot="{ copy, copied }"
      :source="shareUrl"
    >
      <BButton
        @click="copy()"
        variant="primary"
        size="lg"
        pill
        class="flex-shrink-0 ms-3 mb-3"
      >
        <IconCopy class="svg-icon" />
        {{
          copied
            ? t('uicomponents.share_dialog.button_copied')
            : t('uicomponents.share_dialog.button_copy')
        }}
      </BButton>
    </UseClipboard>
  </div>
  <!-- <div class="text-center">
    <img
      :src="qrcode"
      alt="QR Code"
      class="img-fluid w-100"
    />
  </div> -->
</template>
