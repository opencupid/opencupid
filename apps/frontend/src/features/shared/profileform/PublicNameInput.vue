<script setup lang="ts">
import { detectMobile } from '@/lib/mobile-detect'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { validatePublicName } from './publicNameValidation'

const { t } = useI18n()

const model = defineModel<string>({
  default: () => '',
})

const isMobile = detectMobile()
const inputRef = ref<HTMLInputElement | null>(null)

const validationError = computed(() => validatePublicName(model.value))

const inputFeedbackText = computed(() => {
  if (validationError.value === 'contains_whitespace') {
    return t('profiles.forms.name_first_name_only')
  }

  return t('profiles.forms.name_invalid')
})

onMounted(() => {
  if (!isMobile && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<template>
  <BFormFloatingLabel
    :label="t('profiles.forms.name_label')"
    label-for="publicName"
    class="my-2"
  >
    <BInput
      size="lg"
      v-model.trim="model"
      id="publicName"
      type="text"
      placeholder=""
      label="publicName"
      maxlength="25"
      autocomplete="off"
      ref="inputRef"
      lazy
    >
    </BInput>
    <BFormInvalidFeedback>{{ inputFeedbackText }}</BFormInvalidFeedback>
  </BFormFloatingLabel>
</template>
