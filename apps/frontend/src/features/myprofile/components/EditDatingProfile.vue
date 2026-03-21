<script setup lang="ts">
import { computed } from 'vue'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

import type { GenderPickerModel } from '@/features/shared/profileform/GenderPronounSelector.vue'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'

const formData = defineModel<EditFieldProfileFormWithImages>({ required: true })

const genderPronounsModel = computed<GenderPickerModel>({
  get: () => ({ gender: formData.value.gender, pronouns: formData.value.pronouns }),
  set: (val) => {
    formData.value.gender = val.gender
    formData.value.pronouns = val.pronouns
  },
})

const birthYear = computed(() =>
  formData.value.birthday ? new Date(formData.value.birthday).getFullYear() : null
)
</script>

<template>
  <div class="d-flex flex-column w-100 gap-4 py-md-3">
    <div>
      <GenderPronounSelector v-model="genderPronounsModel" />
    </div>

    <div>
      <legend class="fs-6">{{ $t('onboarding.relationship_title') }}</legend>
      <div class="mb-3">
        <RelationstatusSelector v-model="formData.relationship" />
      </div>
      <HaskidsSelector v-model="formData.hasKids" />
    </div>

    <div>
      <legend class="fs-6">{{ $t('onboarding.dating_intro_title') }}</legend>
      <IntrotextEditor
        v-model="formData.introDatingLocalized"
        :languages="formData.languages"
        :placeholder="$t('onboarding.dating_intro_placeholder')"
      />
    </div>
  </div>
</template>
