<script setup lang="ts">
import { detectMobile } from '@/lib/mobile-detect'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const model = defineModel<string>({
  default: () => '',
})

const isMobile = detectMobile()
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (!isMobile && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<template>
  <BFormFloatingLabel :label="t('profiles.forms.name_label')" label-for="publicName" class="my-2">
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
    <!-- public name hint  -->
    <!-- <div class="form-text text-muted"> -->
    <!-- First name only please. -->
    <!-- {{ t('profiles.forms.publicname_hint') }} -->
    <!-- </div> -->
    <BFormInvalidFeedback>{{ t('profiles.forms.name_invalid') }}</BFormInvalidFeedback>
  </BFormFloatingLabel>
</template>
