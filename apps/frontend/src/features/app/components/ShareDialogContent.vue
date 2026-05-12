<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { UseClipboard } from '@vueuse/components'
import IconCopy from '@/assets/icons/interface/copy.svg'
import type { SharePayload } from './ShareSheet.vue'

const { t } = useI18n()

const props = defineProps<{
  payload: SharePayload
}>()
</script>

<template>
  <div class="text-center w-100">
    <code class="d-block overflow-hidden text-truncate mb-2 w-100">{{ props.payload.url }}</code>
    <UseClipboard
      v-slot="{ copy, copied }"
      :source="props.payload.url"
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
