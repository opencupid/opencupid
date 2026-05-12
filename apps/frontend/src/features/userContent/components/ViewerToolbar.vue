<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import IconCopy from '@/assets/icons/interface/copy.svg'
import IconMessage from '@/assets/icons/interface/message.svg'

import ShareButton from './ShareButton.vue'
import { type SharePayload } from '@/features/app/components/ShareSheet.vue'

export type ViewerAction = 'contact' | 'copy' | 'share'

const props = defineProps<{
  actions: ViewerAction[]
  copyText: string
  sharePayload: SharePayload
}>()

defineEmits<{
  (e: 'contact'): void
}>()

const { t } = useI18n()
const toast = useToast()
const {
  copy,
  copied,
  isSupported: clipboardSupported,
} = useClipboard({ source: () => props.copyText })

async function handleCopy() {
  if (!clipboardSupported.value) {
    toast.error(t('userContent.actions.clipboard_unsupported'))
    return
  }
  await copy(props.copyText)
  if (copied.value) toast.success(t('userContent.actions.copied'))
}
</script>

<template>
  <div class="d-flex align-items-center">
    <template
      v-for="action in actions"
      :key="action"
    >
      <BButton
        v-if="action === 'contact'"
        @click.stop="$emit('contact')"
        variant="link-secondary"
        size="sm"
        :title="t('userContent.actions.contact')"
        :aria-label="t('userContent.actions.contact')"
      >
        <IconMessage class="svg-icon" />
      </BButton>
      <BButton
        v-else-if="action === 'copy'"
        @click.stop="handleCopy"
        variant="link-secondary"
        size="sm"
        :title="t('userContent.actions.copy')"
        :aria-label="t('userContent.actions.copy')"
      >
        <IconCopy class="svg-icon" />
      </BButton>
      <ShareButton
        v-else-if="action === 'share'"
        :payload="sharePayload"
      />
    </template>

    <slot />
  </div>
</template>
