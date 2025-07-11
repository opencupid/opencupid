<script setup lang="ts">
import useEditFields from '@/features/shared/composables/useEditFields'
import { type EditProfileForm } from '@zod/profile/profile.form'
import AgeSelector from '@/features/shared/profileform/AgeSelector.vue'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
import GenderSelectorTitle from '@/features/shared/ui/GenderSelectorTitle.vue'

import { useI18n } from 'vue-i18n'

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
    <!-- I was born... -->
    <legend>{{ t('onboarding.age_title') }}</legend>
    <!-- <p class="wizard-step-subtitle"> -->
    <!-- I've been on this planet since -->
    <!-- {{ t('onboarding.age_subtitle') }} -->
    <!-- </p> -->
    <AgeSelector v-model="birthdayModel" />
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
      <RelationstatusSelector v-model="relationshipModel" />
    </div>
    <HaskidsSelector v-model="hasKidsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('introDating')">
    <!-- dating intro title -->
    <legend>{{ t('onboarding.dating_intro_title') }}</legend>
    <IntrotextEditor
      v-model="introDatingModel"
      :languages="formData.languages"
      :placeholder="t('onboarding.dating_intro_placeholder')"
    />
    <div class="form-text text-muted">
      <!-- This is optional, you can fill it out later. -->
      {{ t('onboarding.dating_intro_hint') }}
    </div>
  </fieldset>
</template>
