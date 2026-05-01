<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UserIdentifyPayload } from '@zod/user/user.dto'
import { emailRegex } from '@/lib/utils'
import { tracker } from '@/lib/umami'
import CaptchaWidget from './CaptchaWidget.vue'
import { useI18n } from 'vue-i18n'

import IconTick from '@/assets/icons/interface/tick.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import IconLogin from '@/assets/icons/interface/login.svg'

const { t } = useI18n()

const props = defineProps<{
  isLoading: boolean
  defaultAuthId?: string
}>()

const emit = defineEmits<{
  (e: 'updated', identifier: UserIdentifyPayload): void
}>()

const authIdInput = ref(props.defaultAuthId || '')
const captchaPayload = ref('')
const error = ref('')

const authIdentifier = computed<UserIdentifyPayload>(() => ({
  email: authIdInput.value,
  captchaSolution: captchaPayload.value || '',
  language: '',
}))

async function handleSendLoginLink() {
  if (!authIdInput.value) {
    error.value = t('auth.auth_id_input_empty')
    return
  }
  tracker.track('auth-email-submitted')
  emit('updated', authIdentifier.value)
}

const inputState = computed(() => {
  if (!authIdInput.value || authIdInput.value === '') return null
  return emailRegex.test(authIdInput.value)
})

const formState = computed(() => {
  return inputState.value && captchaPayload.value !== ''
})

const validated = computed(() => {
  return !!(authIdInput.value !== '' && inputState.value)
})

function handleCaptchaUpdatePayload(payload: string) {
  captchaPayload.value = payload
}
</script>

<template>
  <div>
    <div class="text-center">{{ t('auth.auth_id_intro') }}</div>
    <BForm
      @submit.prevent="handleSendLoginLink"
      class="userIdForm"
      :novalidate="true"
      :validated="validated"
      :disabled="isLoading"
      :state="formState"
    >
      <div class="mb-1 mb-md-3">
        <BFormFloatingLabel
          floating
          :label="t('auth.auth_id_input_label')"
          label-for="authIdInput"
          class="my-2"
          :state="null"
        >
          <BInput
            size="lg"
            v-model.trim="authIdInput"
            id="authIdInput"
            type="text"
            :label="t('auth.auth_id_input_label')"
            :placeholder="t('auth.auth_id_input_placeholder')"
            maxlength="80"
            aria-autocomplete="none"
            autofocus
            autocomplete="off"
            :state="inputState"
            lazy
          >
          </BInput>
          <div class="suffix-icon">
            <span
              class="text-success"
              v-if="inputState"
            >
              <IconTick class="svg-icon" />
            </span>
            <span
              class="text-muted"
              v-else
            >
              <IconMail class="svg-icon" />
            </span>
          </div>
        </BFormFloatingLabel>
      </div>

      <div class="mb-1 mb-md-3 user-select-none">
        <CaptchaWidget
          v-if="!props.isLoading"
          @update:payload="handleCaptchaUpdatePayload"
        />
      </div>
      <BButton
        type="submit"
        variant="primary"
        size="lg"
        class="w-100"
        label="Continue"
        :disabled="isLoading || !formState"
      >
        <IconLogin class="svg-icon" /> {{ t('auth.login') }}
      </BButton>
    </BForm>
  </div>
</template>

<style scoped lang="scss">
.suffix-icon {
  position: absolute;
  top: 0.5em;
  right: 1em;
  height: 2rem;
  padding-top: 0.25rem;
  .svg-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
}
</style>
