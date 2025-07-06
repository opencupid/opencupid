<script setup lang="ts">
import useEditFields from '@/features/shared/composables/useEditFields'
import { type EditProfileForm } from '@zod/profile/profile.form'
import AgeSelector from '@/features/shared/profileform/AgeSelector.vue'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
import { useI18n } from 'vue-i18n'
import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'

const formData = defineModel<EditProfileForm>({
  default: () => ({
    birthday: null,
    genderPronouns: null,
    relationshipStatus: null,
    hasKids: null,
    introSocial: '',
    introDating: '',
  }),
})

const { t } = useI18n()

const props = defineProps<{
  isCurrent: (step: any) => boolean
}>()

const {
  publicNameModel,
  birthdayModel,
  relationshipModel,
  hasKidsModel,
  introSocialModel,
  introDatingModel,
  genderPronounsModel,
} = useEditFields(formData.value)
</script>

<template>
  <fieldset v-if="isCurrent('age')">
    <!-- age selector title -->
    <legend>{{ t('onboarding.steps.age_legend') }}</legend>
    <p class="wizard-step-subtitle">
      <!-- age selector input hint -->
      I've been on this planet since
    </p>
    <AgeSelector v-model="birthdayModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('gender')">
    <legend class="gender-icons d-flex w-100 justify-content-center align-items-center">
      <GenderSymbol gender="female" />
      <GenderSymbol gender="male" />
      <GenderSymbol gender="transfeminine" />
      <GenderSymbol gender="bigender" />
      <GenderSymbol gender="trans_man" />
      <GenderSymbol gender="non_binary" />
    </legend>
    <p class="wizard-step-subtitle">
      <!-- gender selector hint -->
      {{ t('onboarding.steps.gender_legend') }}
    </p>
    <GenderPronounSelector v-model="genderPronounsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('family_situation')">
    <!-- relationship status step title -->
    <legend>{{ t('onboarding.steps.situation_legend') }}</legend>
    <p class="wizard-step-subtitle">
      My family situation is
    </p>
    <div class="mb-3">
      <RelationstatusSelector v-model="relationshipModel" />
    </div>
    <HaskidsSelector v-model="hasKidsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('introDating')">
    <!-- dating intro title -->
    <legend>{{ t('onboarding.steps.intro_find_legend') }}</legend>
    <p class="wizard-step-subtitle">
      <!-- dating intro hint -->
      This will be visible only to people who are looking for a relationship as well,
      not to those who are just looking for friends or social connections.
    </p>
    <IntrotextEditor
      v-model="introDatingModel"
      :languages="formData.languages"
      :placeholder="t('onboarding.steps.intro_find_placeholder')"
    />
  </fieldset>
</template>
<style scoped>
:deep(.gender-icons) {
  display: flex;
  gap: 0.5rem;
}
:deep(.gender-icons .icon-wrapper) {
  width: 2rem;
  height: 2rem;
}
:deep(.gender-icons .icon-wrapper .svg-icon) {
  width: 100%;
  height: 100%;
}
</style>
