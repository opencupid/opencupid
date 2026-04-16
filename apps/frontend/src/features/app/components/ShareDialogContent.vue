<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { UseClipboard } from '@vueuse/components'
import IconCopy from '@/assets/icons/interface/copy.svg'

const { t } = useI18n()

const shareUrl = window.location.origin
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
</template>
