<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type LoginUser } from '@zod/user/user.dto'
import { tokenRegex } from '@/lib/utils'

import { useI18n } from 'vue-i18n'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'

const props = defineProps<{
  user: LoginUser
  isLoading: boolean
  validationError: string | null
  validationResult: boolean | null
  initialToken?: string
}>()

const emit = defineEmits<{
  (e: 'token:submit', token: string): void
}>()

const { t } = useI18n()

// input field
const tokenInput = ref(props.initialToken ?? '')

async function handleTokenEntered() {
  emit('token:submit', tokenInput.value)
}

const inputState = computed(() => {
  if (!tokenInput.value) return null
  return tokenRegex.test(tokenInput.value)
})

const validated = computed(() => {
  return inputState.value && props.validationResult === true
})

watch(inputState, (state) => {
  if (state === true) {
    emit('token:submit', tokenInput.value)
  }
})
</script>

<template>
  <div>
    <div class="fs-4 mb-3">
      <ViewTitle
        v-if="user.phonenumber"
        :icon="IconMessage"
        title=""
        class="text-primary"
      />
      <ViewTitle
        v-else
        :icon="IconMail"
        title=""
        class="text-primary"
      />

      <div class="text-center">{{ t('auth.token_check_messages') }}</div>
    </div>
    <div class="mb-3 form-text mb-3">
      <div v-if="user.phonenumber">
        {{ t('auth.token_sent_phone') }}
      </div>
      <div v-else>
        {{ t('auth.token_sent_email') }}
      </div>
    </div>
    <div class="px-3">
      <BForm
        @submit.prevent="handleTokenEntered"
        :novalidate="true"
        :disabled="isLoading || !inputState"
      >
        <div class="d-flex flex-column align-items-center position-relative">
          <BFormFloatingLabel
            :label="t('auth.token_input_label')"
            label-for="tokenInput"
          >
            <BInput
              size="lg"
              v-model.trim="tokenInput"
              id="token"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder=""
              label="tokenInput"
              maxlength="6"
              aria-autocomplete="none"
              autofocus
              autocomplete="one-time-code"
              lazy
              required
              :state="validated"
            >
            </BInput>
            <BFormInvalidFeedback
              v-if="!isLoading"
              force-show
            >
              <span v-if="!inputState"> {{ t('auth.token_invalid_feedback') }}</span>
              <span v-if="validationResult === false && inputState">{{ validationError }}</span>
              &nbsp;
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
</style>
