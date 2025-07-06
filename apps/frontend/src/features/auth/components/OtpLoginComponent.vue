<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type LoginUser } from '@zod/user/user.types'
import { otpRegex } from '@/lib/utils'

import { useI18n } from 'vue-i18n'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'

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
  <div>
    <div class="fs-4 mb-3">
      <ViewTitle v-if="user.phonenumber" :icon="IconMessage" title="" class="text-primary" />
      <ViewTitle v-else :icon="IconMail" title="" class="text-primary" />

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
    <div class="px-3">
    <BForm
      @submit.prevent="handleOTPEntered"
      :novalidate="true"
      :disabled="isLoading || !inputState"
    >
      <div class="d-flex flex-column align-items-center position-relative">
        <BFormFloatingLabel :label="t('auth.otp_input_label')" label-for="otpInput" 
        >
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
      </div>
    </BForm>
  </div>
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
