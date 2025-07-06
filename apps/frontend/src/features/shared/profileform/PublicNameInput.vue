<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const model = defineModel<string>({
  default: () => '',
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
      autofocus
      lazy
    >
    </BInput>
    <!-- public name hint  -->
    <p class="form-text text-muted">First name only please.</p>
    <BFormInvalidFeedback>{{ t('profiles.forms.name_invalid') }}</BFormInvalidFeedback>
  </BFormFloatingLabel>
</template>
