<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { UseClipboard } from '@vueuse/components'
import { useQRCode } from '@vueuse/integrations/useQRCode'
import IconCopy from '@/assets/icons/interface/copy.svg'

const { t } = useI18n()


const showModal = defineModel<boolean>({
  default: false,
  type: Boolean,
})

const shareUrl = window.location.origin
const qrcode = useQRCode(shareUrl, {
  errorCorrectionLevel: 'H',
  margin: 3,
  width: 400,
})
const handleSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  target.select()
}
</script>

<template>
  <BModal
    centered
    v-model="showModal"
    :no-footer="true"
    :no-header="false"
    fullscreen="sm"
    :title="t('uicomponents.share_dialog.title')"
    :backdrop-first="false"
    no-animation
  >
    <BFormGroup class="d-flex align-items-center justify-content-between flex-column mb-3">
      <div class="my-2">
        <BFormInput
          v-model="shareUrl"
          type="text"
          :placeholder="shareUrl"
          readonly
          class="form-control-lg"
          @click="handleSelect"
        />
      </div>
      <UseClipboard v-slot="{ copy, copied }" :source="shareUrl">
        <BButton
          @click="copy()"
          size="lg"
          variant="primary"
          pill
          class="flex-grow-1 flex-shrink-0 ms-3"
        >
          <IconCopy class="svg-icon" />
          {{ copied ? t('uicomponents.share_dialog.button_copied') : t('uicomponents.share_dialog.button_copy') }}
        </BButton>
      </UseClipboard>
    </BFormGroup>
    <div class="col-12 text-center">
      <img :src="qrcode" alt="QR Code" class="img-fluid w-100" />
      <div class="text-muted">
        {{ t('uicomponents.share_dialog.qr_hint') }}
      </div>
    </div>
  </BModal>
</template>
