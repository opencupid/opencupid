<script setup lang="ts">
import { type EditProfileForm } from '@zod/profile/profile.form'
import { createDatingPrefsDefaults, type DatingPreferencesFormType } from '@zod/match/filters.form'
import AgeSelector from '@/features/shared/profileform/AgeSelector.vue'
import type { GenderPickerModel } from '@/features/shared/profileform/GenderPronounSelector.vue'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
import DatingPreferencesForm from '@/features/browse/components/DatingPreferencesForm.vue'

import { useI18n } from 'vue-i18n'
import { computed, watch } from 'vue'

const formData = defineModel<EditProfileForm>({ required: true })
const datingPrefs = defineModel<DatingPreferencesFormType>('datingPrefs', { required: true })

const { t } = useI18n()

const props = defineProps<{
  isCurrent: (step: any) => boolean
}>()

const genderPronounsModel = computed<GenderPickerModel>({
  get: () => ({ gender: formData.value.gender, pronouns: formData.value.pronouns }),
  set: (val) => {
    formData.value.gender = val.gender
    formData.value.pronouns = val.pronouns
  },
})

watch(
  () => [formData.value.birthday, formData.value.gender] as const,
  ([birthday, gender]) => {
    if (
      birthday &&
      gender &&
      gender !== 'unspecified' &&
      datingPrefs.value.prefGender.length === 0
    ) {
      Object.assign(datingPrefs.value, createDatingPrefsDefaults(formData.value))
    }
  },
  { immediate: true }
)
</script>

<template>
  <fieldset v-if="isCurrent('age')">
    <!-- I was born... -->
    <legend>{{ t('onboarding.age_title') }}</legend>
    <!-- <p class="wizard-step-subtitle"> -->
    <!-- I've been on this planet since -->
    <!-- {{ t('onboarding.age_subtitle') }} -->
    <!-- </p> -->
    <AgeSelector v-model="formData.birthday" />
  </fieldset>

  <fieldset v-else-if="isCurrent('gender')">
    <legend class="gender-icons d-flex w-100 justify-content-center align-items-center">
      {{ t('onboarding.gender_subtitle') }}
    </legend>
    <GenderPronounSelector v-model="genderPronounsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('family_situation')">
    <!-- relationship status step title -->
    <legend>{{ t('onboarding.relationship_title') }}</legend>
    <div class="mb-3">
      <RelationstatusSelector v-model="formData.relationship" />
    </div>
    <HaskidsSelector v-model="formData.hasKids" />
  </fieldset>

  <fieldset v-else-if="isCurrent('introDating')">
    <!-- dating intro title -->
    <legend>{{ t('onboarding.dating_intro_title') }}</legend>
    <IntrotextEditor
      v-model="formData.introDatingLocalized"
      :languages="formData.languages"
      :placeholder="t('onboarding.dating_intro_placeholder')"
    />
    <div class="form-text text-muted">
      <!-- This is optional, you can fill it out later. -->
      {{ t('onboarding.dating_intro_hint') }}
    </div>
  </fieldset>

  <fieldset v-else-if="isCurrent('preferences')">
    <legend>{{ t('onboarding.dating_preferences_title') }}</legend>
    <DatingPreferencesForm
      v-if="datingPrefs"
      v-model="datingPrefs"
    />
  </fieldset>
</template>
