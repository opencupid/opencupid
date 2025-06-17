<script setup lang="ts">
import { ref } from 'vue'
import { type LoginUser } from '@zod/user/user.types'
import { otpRegex } from '@/lib/utils'

import DoodleIcons from '@/components/icons/DoodleIcons.vue'

const props = defineProps<{
  user: LoginUser
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'otp:submit', otp: string): void
}>()

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
          <DoodleIcons name="IconMessage" class="svg-icon" />
        </span>
        <span v-else>
          <DoodleIcons name="IconMail" class="svg-icon" />
        </span>
      </span>
      Check your messages
    </div>
    <div class="mb-3 form-text mb-3">
      <div v-if="user.phonenumber">
        We have sent you a little code to your phone number, please enter it below.
      </div>
      <div v-else>
        We have sent you a login link, check your inbox. If you don't see it, please check your spam
        folder.
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
        />
      </div>

      <FormKit
        type="submit"
        wrapper-class="d-grid gap-2 mb-3"
        input-class="btn-primary btn-lg w-100"
        label="Continue"
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
