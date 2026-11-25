<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside, onKeyStroke, useTimeoutFn } from '@vueuse/core'
import { BButton, BForm, BFormTextarea } from 'bootstrap-vue-next'

import IconMessage from '@/assets/icons/interface/message.svg'
import { useMessageStore } from '@/features/messaging/stores/messageStore'

// How long the user can stay on a step before the button draws attention.
const STUCK_AFTER_MS = 60_000
// How long the confirmation stays up before the popup closes.
const CLOSE_AFTER_SENT_MS = 20_000

const props = defineProps<{
  /** The current wizard step; a change means the user has moved on. */
  step: number
}>()

const { t } = useI18n()
const messageStore = useMessageStore()

const contactEmail = __APP_CONFIG__.EMAIL_REPLY_TO

const isOpen = ref(false)
const content = ref('')
const isSending = ref(false)
const status = ref<'idle' | 'sent' | 'failed'>('idle')

const root = useTemplateRef<HTMLDivElement>('root')
const textarea = useTemplateRef<{ focus: () => void }>('textarea')

const isStuck = ref(false)
const { start: startStuckTimer, stop: stopStuckTimer } = useTimeoutFn(() => {
  isStuck.value = true
}, STUCK_AFTER_MS)

watch(
  () => props.step,
  () => {
    isStuck.value = false
    if (!isOpen.value) startStuckTimer()
  }
)

const { start: startCloseTimer, stop: stopCloseTimer } = useTimeoutFn(close, CLOSE_AFTER_SENT_MS, {
  immediate: false,
})

async function open() {
  // No need to point out the button while its popup is open.
  stopStuckTimer()
  isStuck.value = false
  stopCloseTimer()
  status.value = 'idle'
  isOpen.value = true
  await nextTick()
  textarea.value?.focus()
}

function close() {
  // Also called for every outside click and Escape while already closed.
  if (!isOpen.value) return
  isOpen.value = false
  startStuckTimer()
}

onClickOutside(root, close)
onKeyStroke('Escape', close)

async function send() {
  if (!content.value.trim() || isSending.value) return
  isSending.value = true
  const res = await messageStore.sendHelpRequest(content.value)
  isSending.value = false
  status.value = res.success ? 'sent' : 'failed'
  if (res.success) {
    content.value = ''
    startCloseTimer()
  }
}
</script>

<template>
  <div
    ref="root"
    class="onboarding-help"
  >
    <Transition name="help-popup">
      <div
        v-if="isOpen"
        id="onboarding-help-popup"
        class="help-popup rounded-4 shadow p-3 mb-2"
        role="dialog"
        :aria-label="t('onboarding.help.button_hint')"
      >
        <div class="d-flex justify-content-end">
          <button
            type="button"
            class="btn-close"
            :aria-label="t('onboarding.help.close')"
            @click="close"
          />
        </div>

        <p
          v-if="status === 'sent'"
          class="mb-0"
          role="status"
        >
          {{ t('onboarding.help.sent') }}
        </p>
        <BForm
          v-else
          @submit.prevent="send"
        >
          <label
            for="onboarding-help-message"
            class="form-label"
          >
            <!-- Got stuck here? Please tell us what went wrong. -->
            {{ t('onboarding.help.prompt') }}
          </label>
          <BFormTextarea
            id="onboarding-help-message"
            ref="textarea"
            v-model="content"
            rows="4"
            no-resize
            :disabled="isSending"
          />
          <p
            v-if="status === 'failed'"
            class="text-danger small mt-2 mb-0"
            role="alert"
          >
            {{ t('onboarding.help.error') }}
          </p>
          <div class="text-end mt-2">
            <BButton
              type="submit"
              variant="primary"
              pill
              :disabled="isSending || !content.trim()"
            >
              {{ t('onboarding.help.send') }}
            </BButton>
          </div>
        </BForm>

        <p
          v-if="contactEmail"
          class="form-text text-muted mt-2 mb-0"
        >
          <!-- You can also contact us at... -->
          {{ t('onboarding.help.contact') }}
          <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>
      </div>
    </Transition>

    <BButton
      variant="secondary"
      class="help-button rounded-circle shadow d-flex align-items-center justify-content-center p-0"
      :class="{ 'help-button-pulse': isStuck }"
      :title="t('onboarding.help.button_hint')"
      :aria-label="t('onboarding.help.button_hint')"
      :aria-expanded="isOpen"
      aria-controls="onboarding-help-popup"
      @click="isOpen ? close() : open()"
    >
      <IconMessage class="svg-icon" />
    </BButton>
  </div>
</template>

<style scoped lang="scss">
.onboarding-help {
  position: fixed;
  right: calc(1rem + env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  // The box spans the popup's width; only its children take clicks.
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.help-popup {
  width: min(20rem, calc(100vw - 2rem));
  background-color: var(--surface-bg);
  border: 1px solid var(--surface-border);
}

.help-button {
  width: 3.25rem;
  height: 3.25rem;

  :deep(.svg-icon) {
    width: 1.75rem;
    height: 1.75rem;
  }
}

.help-button-pulse {
  animation: help-pulse 1.5s ease-in-out infinite;
}

@keyframes help-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .help-button-pulse {
    animation: none;
  }
}

.help-popup-enter-active,
.help-popup-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.help-popup-enter-from,
.help-popup-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
