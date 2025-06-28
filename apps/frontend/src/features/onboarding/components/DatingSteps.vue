<script setup lang="ts">
import useEditFields from '@/features/shared/composables/useEditFields'
import { type EditProfileForm } from '@zod/profile/profile.form'
import AgeSelector from '@/features/shared/profileform/AgeSelector.vue'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
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
    <legend>{{ t('onboarding.steps.age_legend') }}</legend>
    <AgeSelector v-model="birthdayModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('gender')">
    <legend>{{ t('onboarding.steps.gender_legend') }}</legend>
    <GenderPronounSelector v-model="genderPronounsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('family_situation')">
    <legend>{{ t('onboarding.steps.situation_legend') }}</legend>
    <div class="mb-3">
      <RelationstatusSelector v-model="relationshipModel" />
    </div>
    <HaskidsSelector v-model="hasKidsModel" />
  </fieldset>

  <fieldset v-else-if="isCurrent('introDating')">
    <legend>{{ t('onboarding.steps.intro_find_legend') }}</legend>
    <IntrotextEditor
      v-model="introDatingModel"
      :languages="formData.languages"
      :placeholder="t('onboarding.steps.intro_find_placeholder')"
    />
  </fieldset>
</template>
