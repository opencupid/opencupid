<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type LoginUser } from '@zod/user/user.types'
import { otpRegex } from '@/lib/utils'

import IconMessage from '@/assets/icons/interface/message.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  user: LoginUser
  isLoading: boolean
  validationError: string | null
  validationResult: boolean | null
}>()

const emit = defineEmits<{
  (e: 'otp:submit', otp: string): void
}>()

const { t } = useI18n()

// input field
const otpInput = ref('')

// Method to handle OTP entered
async function handleOTPEntered() {
  emit('otp:submit', otpInput.value)
}

const inputState = computed(() => {
  if (!otpInput.value) return null
  // Simple validation for OTP: must be a number and 6 digits long
  return otpRegex.test(otpInput.value)
})

const validated = computed(() => {
  return inputState.value && props.validationResult === true
})

watch(inputState, state => {
  if (state === true) {
    emit('otp:submit', otpInput.value)
  }
})
</script>

<template>
  <div class="otp-form">
    <div class="fs-4 mb-3">
      <span class="text-muted opacity-50">
        <span v-if="user.phonenumber">
          <IconMessage class="svg-icon" />
        </span>
        <span v-else>
          <IconMail class="svg-icon" />
        </span>
      </span>
      {{ t('auth.otp_check_messages') }}
    </div>
    <div class="mb-3 form-text mb-3">
      <div v-if="user.phonenumber">
        {{ t('auth.otp_sent_phone') }}
      </div>
      <div v-else>
        {{ t('auth.otp_sent_email') }}
      </div>
    </div>
    <BForm
      @submit.prevent="handleOTPEntered"
      class="otp-form"
      :novalidate="true"
      :disabled="isLoading || !inputState"
    >
      <div class="mb-3">
        <BFormFloatingLabel :label="t('auth.otp_input_label')" label-for="otpInput" class="my-2">
          <BInput
            size="lg"
            v-model.trim="otpInput"
            id="otp"
            type="text"
            placeholder=""
            label="otpInput"
            maxlength="25"
            aria-autocomplete="none"
            autofocus
            autocomplete="off"
            lazy
            required
            :state="validated"
          >
          </BInput>
          <BFormInvalidFeedback v-if="!isLoading">
            <span v-if="!inputState"> {{ t('auth.otp_invalid_feedback') }}</span>
            <span v-if="validationResult === false && inputState">{{ validationError }}</span>
          </BFormInvalidFeedback>
        </BFormFloatingLabel>

        <!-- <FormKit
          type="text"
          v-model="otpInput"
          label="Login code..."
          id="otp"
          :floating-label="true"
          input-class="form-control-lg"
          aria-autocomplete="none"
          autocomplete="off"
          autofocus
          validation="+validateOtp"
          :validation-rules="{
            validateOtp,
          }"
          validation-visibility="live"
        /> -->
      </div>

      <!-- <BButton
        type="submit"
        size="lg"
        class="w-100"
        variant="primary"
        label="Continue"
        :disabled="isLoading || !inputState"
      >Continue</BButton> -->
    </BForm>
  </div>
</template>

<style scoped>
.suffix-icon {
  position: absolute;
  top: 0.75em;
  right: 1em;
}

input.form-control.is-valid,
input.form-control.is-invalid {
  background-image: none !important;
}
</style>
