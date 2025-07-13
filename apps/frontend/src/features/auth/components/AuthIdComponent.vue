<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { UserIdentifyPayload } from '@zod/user/user.dto'
import { emailRegex, phoneRegex } from '@/lib/utils'
import CaptchaWidget from './CaptchaWidget.vue'
import { useI18n } from 'vue-i18n'

import IconTick from '@/assets/icons/interface/tick.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import IconPhone from '@/assets/icons/interface/phone.svg'
import IconLogin from '@/assets/icons/interface/login.svg'

const { t } = useI18n()

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'updated', identifier: UserIdentifyPayload): void
}>()

// State variables
const authIdInput = ref('')
const captchaPayload = ref('')
const error = ref('')

const authIdentifier = computed(() => {
  return {
    email: emailRegex.test(authIdInput.value) ? authIdInput.value : '',
    phonenumber: phoneRegex.test(authIdInput.value) ? authIdInput.value : '',
    captchaSolution: captchaPayload.value || '',
    language: '',
  }
})

// Method to handle sending login link
async function handleSendLoginLink() {
  if (!authIdInput.value) {
    error.value = t('auth.auth_id_input_empty') // "Please enter your email or phone number."
    return
  }
  emit('updated', authIdentifier.value)
}

const inputState = computed(() => {
  if (!authIdInput.value || authIdInput.value === '') return null
  // Check if the input is a valid email or phone number
  return emailRegex.test(authIdInput.value) || phoneRegex.test(authIdInput.value)
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

      <div class="mb-1 mb-md-3 user-select-none">
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

input.form-control.is-valid,
input.form-control.is-invalid {
  background-image: none !important;
}
</style>
