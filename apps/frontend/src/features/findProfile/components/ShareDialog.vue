<script lang="ts" setup>
import { UseClipboard } from '@vueuse/components'
import { useQRCode } from '@vueuse/integrations/useQRCode'
import IconCopy from '@/assets/icons/interface/copy.svg'

const shareUrl = __APP_CONFIG__.FRONTEND_URL
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
  <div>
    <div class="mb-3">
      <BFormGroup class="d-flex align-items-center justify-content-between flex-row mb-3">
        <BFormInput v-model="shareUrl" type="text" :placeholder="shareUrl" readonly size="md" class="flex-shrink-1" @click="handleSelect"/>
        <UseClipboard v-slot="{ copy, copied }" :source="shareUrl">
          <BButton @click="copy()" size="md" variant="primary" pill class="flex-grow-1 flex-shrink-0 ms-3">
            <IconCopy class="svg-icon" />
            {{ copied ? 'Copied' : 'Copy' }}
          </BButton>
        </UseClipboard>
      </BFormGroup>
      <div class="col-12 text-center">
      <img :src="qrcode" alt="QR Code" class="img-fluid w-100" />
      </div>
    </div>
  </div>
</template>
