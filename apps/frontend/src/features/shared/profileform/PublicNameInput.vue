<script setup lang="ts">
import { detectMobile } from '@/lib/mobile-detect'
import { refDebounced } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { validatePublicName } from './publicNameValidation'

const { t } = useI18n()

const model = defineModel<string>({
  default: () => '',
})

const isMobile = detectMobile()
const inputRef = ref<HTMLInputElement | null>(null)

const validationResult = computed(() => validatePublicName(model.value))
const validated = computed<boolean | null>(() => {
  if (model.value === '') return null
  return validationResult.value === null
})
const debouncedValidated = refDebounced(validated, 1000)
const inputFeedbackText = computed(() => {
  if (validationResult.value === 'contains_whitespace') {
    return t('profiles.forms.name_first_name_only')
  }

  return ''
})

onMounted(() => {
  if (!isMobile && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<template>
  <BFormFloatingLabel
    floating
    :label="t('profiles.forms.name_label')"
    label-for="publicName"
    class="my-2"
    :state="null"
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
      :state="debouncedValidated"
    >
    </BInput>
    <BFormInvalidFeedback
      force-show
      class="text-center"
      :class="{ invisible: debouncedValidated !== false }"
    >
      {{ inputFeedbackText }} &nbsp;</BFormInvalidFeedback
    >
  </BFormFloatingLabel>
</template>
