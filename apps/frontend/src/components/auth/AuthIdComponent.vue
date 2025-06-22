<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AuthIdentifierCaptchaInput } from '@zod/user/user.dto'
import { emailRegex, phoneRegex } from '@/lib/utils'
import CaptchaWidget from './CaptchaWidget.vue'
import Logo from '@/assets/icons/app/logo.svg'
import { useI18n } from 'vue-i18n'

import IconTick from '@/assets/icons/interface/tick.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import IconPhone from '@/assets/icons/interface/phone.svg'
import IconLogin from '@/assets/icons/interface/login.svg'
import LocaleSelector from './LocaleSelector.vue'

const { t } = useI18n()

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'otp:send', identifier: AuthIdentifierCaptchaInput): void,
  (e: 'language:select', language: string): void
}>()

// State variables
const authIdInput = ref('')
const captchaPayload = ref('')
const error = ref('')

const authIdentifier = computed(() => {
  // console.log('authIdInput.value:', authIdInput.value)
  return {
    email: emailRegex.test(authIdInput.value) ? authIdInput.value : '',
    phonenumber: phoneRegex.test(authIdInput.value) ? authIdInput.value : '',
    captchaSolution: captchaPayload.value || '',
    language:'',
  }
})

// Method to handle sending login link
async function handleSendLoginLink() {
  if (!authIdInput.value) {
    error.value = t('auth.auth_id_input_empty') // "Please enter your email or phone number."
    return
  }
  emit('otp:send', authIdentifier.value)
}

const inputState = computed(() => {
  // console.log('Validating Auth ID:', authIdInput.value)
  if (!authIdInput.value || authIdInput.value === '') return null
  // Check if the input is a valid email or phone number
  return emailRegex.test(authIdInput.value) || phoneRegex.test(authIdInput.value)
})

const formState = computed(() => {
  // console.log('Form state:', inputState.value)
  return inputState.value && captchaPayload.value !== ''
})

const validated = computed(() => {
  // console.log('Validating Auth ID state:', state.value)
  return !!(authIdInput.value !== '' && inputState.value)
})

function handleCaptchaUpdatePayload(payload: string) {
  // console.log('Captcha payload updated:', payload)
  captchaPayload.value = payload
}

const authIdInputRef = ref<InstanceType<any> | null>(null)
</script>

<template>
  <div class="auth-id-component">
    <div class="d-flex justify-content-center align-items-center flex-column h-100 mb-4">
      <div class="icon-inner text-success animate__animated animate__fadeIn">
        <Logo class="svg-icon logo" />
      </div>
    </div>

    <BForm
      @submit.prevent="handleSendLoginLink"
      class="userIdForm"
      :novalidate="true"
      :validated="validated"
      :disabled="isLoading"
      :state="formState"
    >
      <div class="mb-3">
        <BFormFloatingLabel
          floating
          label="Email or phone number"
          label-for="authIdInput"
          class="my-2"
          :state="null"
        >
          <BInput
            size="lg"
            v-model.trim="authIdInput"
            id="authIdInput"
            ref="authIdInputRef"
            type="text"
            :label="t('auth.auth_id_input_label')"
            :placeholder="t('auth.auth_id_input_placeholder')"
            maxlength="25"
            aria-autocomplete="none"
            autofocus
            autocomplete="off"
            :state="inputState"
            lazy
          >
          </BInput>
          <div class="suffix-icon">
            <span class="text-success" v-if="inputState">
              <IconTick class="svg-icon" />
            </span>
            <span class="text-muted" v-else>
              <IconMail class="svg-icon" v-if="authIdInput.includes('@')" />
              <IconPhone class="svg-icon" v-else-if="authIdInput.startsWith('+')" />
            </span>
          </div>
        </BFormFloatingLabel>
      </div>

      <div class="mb-3">
        <CaptchaWidget v-if="!props.isLoading" @update:payload="handleCaptchaUpdatePayload" />
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
    <div class="d-flex justify-content-center align-items-center mt-3">
      <LocaleSelector @language:select="lang => $emit('language:select', lang)" />
    </div>
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

.svg-icon {
  fill: currentColor;
}

.logo {
  width: 7.5rem;
  height: 7.5rem;
  color: currentColor;
}

input.form-control.is-valid,
input.form-control.is-invalid {
  background-image: none !important;
}
</style>
