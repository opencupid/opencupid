<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

import useEditFields from '@/features/shared/composables/useEditFields'
import GenderPronounSelector from '@/features/shared/profileform/GenderPronounSelector.vue'
import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import HaskidsSelector from '@/features/shared/profileform/HaskidsSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'

const { t } = useI18n()

defineEmits<{
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const formData = defineModel<EditFieldProfileFormWithImages>({ required: true })

const { genderPronounsModel, relationshipModel, hasKidsModel, introDatingModel } = useEditFields(
  formData.value
)

const birthYear = computed(() =>
  formData.value.birthday ? new Date(formData.value.birthday).getFullYear() : null
)
</script>

<template>
  <div class="d-flex flex-column w-100 gap-4 py-md-3">
    <fieldset>
      <GenderPronounSelector v-model="genderPronounsModel" />
    </fieldset>

    <fieldset>
      <legend class="fs-6">{{ t('onboarding.relationship_title') }}</legend>
      <div class="mb-3">
        <RelationstatusSelector v-model="relationshipModel" />
      </div>
      <HaskidsSelector v-model="hasKidsModel" />
    </fieldset>

    <fieldset>
      <legend class="fs-6">{{ t('onboarding.dating_intro_title') }}</legend>
      <IntrotextEditor
        v-model="introDatingModel"
        :languages="formData.languages"
        :placeholder="t('onboarding.dating_intro_placeholder')"
      />
    </fieldset>

    <!-- <div class="d-flex justify-content-center gap-2 mt-2">
      <BButton
        variant="link"
        class="link-secondary"
        @click="$emit('cancel')"
      >
        {{ t('onboarding.wizard.cancel') }}
      </BButton>
      <BButton
        variant="primary"
        pill
        class="px-5"
        @click="$emit('save')"
      >
        {{ t('onboarding.wizard.finish') }}
      </BButton>
    </div> -->
  </div>
</template>
