<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type LoginUser } from '@zod/user.schema'
import { otpRegex } from '@/lib/utils'

import { IconMail } from '@/components/icons/DoodleIcons'
import { IconMessage } from '@/components/icons/DoodleIcons'

const props = defineProps<{
  user: LoginUser
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'otp:submit', otp: string): void
}>()

const { t } = useI18n()
// Reactive variables
const otpInput = ref('')
const error = ref('' as string)

// Method to handle OTP entered
async function handleOTPEntered() {
  emit('otp:submit', otpInput.value)
}

function validateOtp(node: any) {
  const value = node.value as string
  console.log('Validating OTP:', value)
  if (!value) return false

  // Simple validation for OTP: must be a number and 6 digits long
  return otpRegex.test(value)
}
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
      {{ t('auth.check_your_messages') }}
    </div>
    <div class="mb-3 form-text mb-3">
      <div v-if="user.phonenumber">
        {{ t('auth.otp_sms_instruction') }}
      </div>
      <div v-else>
        {{ t('auth.otp_email_instruction') }}
      </div>
    </div>

    <FormKit
      type="form"
      id="otpForm"
      :actions="false"
      :disabled="isLoading"
      #default="{ state: { valid } }"
      @submit="handleOTPEntered"
    >
      <div class="mb-3">
        <FormKit
          type="text"
          v-model="otpInput"
          :label="t('auth.otp_label')"
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
        />
      </div>

      <FormKit
        type="submit"
        wrapper-class="d-grid gap-2 mb-3"
        input-class="btn-primary btn-lg w-100"
        :label="t('auth.continue')"
        :disabled="!valid || isLoading"
      />
    </FormKit>
  </div>
</template>

<style scoped>
:deep(ul.formkit-messages) {
  display: none;
}

.suffix-icon {
  position: absolute;
  top: 0.75em;
  right: 1em;
}

.formkit-input {
  padding-right: 3.5rem;
  /* Adjust padding to accommodate suffix icon */
}
</style>
