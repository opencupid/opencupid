<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { type PublicProfile } from '@zod/profile/profile.dto'

import ImageCarousel from './ImageCarousel.vue'
import ActionButtons from './ActionButtons.vue'
import LanguageList from '../display/LanguageList.vue'
import TagList from '../display/TagList.vue'
import LocationLabel from '../display/LocationLabel.vue'
import DatingIcon from '../display/DatingIcon.vue'
import GenderPronounLabel from '../display/GenderPronounLabel.vue'
import RelationshipTags from '../display/RelationshipTags.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
// Edit components
import EditField from '@/components/profiles/public/EditField.vue'
import PublicNameInput from '@/components/profiles/forms/PublicNameInput.vue'
import LocationSelector from '../forms/LocationSelector.vue'
import LanguageSelector from '@/components/profiles/forms/LanguageSelector.vue'
import TagSelectComponent from '@/components/profiles/forms/TagSelectComponent.vue'
import IntrotextEditor from '@/components/profiles/forms/IntrotextEditor.vue'
import ImageEditor from '../image/ImageEditor.vue'

const { t } = useI18n()

const props = defineProps<{
  profile: PublicProfile
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'intent:conversation:open', conversationId: string): void
  (e: 'intent:profile:edit'): void
  (e: 'intent:field:edit'): void
}>()
</script>

<template>
  <div>
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6 position-relative user-select-none">
        <div class="overflow-hidden rounded">
          <ImageCarousel :profile />
        </div>

        <div class="icons">
          <DatingIcon :profile />
        </div>

        <div class="action-buttons">
          <ActionButtons
            :profile
            @intent:profile:edit="emit('intent:profile:edit')"
            @intent:conversation:open="
              conversationId => emit('intent:conversation:open', conversationId)
            "
          />
          <EditField
            fieldName="profileImages"
            :editComponent="ImageEditor"
            buttonClass="btn btn-overlay rounded-4"
          >
            <IconPhoto class="svg-icon" />
          </EditField>
        </div>

        <div class="d-flex flex-row align-items-center mt-2">
          <div class="flex-grow-1 d-inline-flex align-items-center">
            <span class="fw-bolder fs-2 me-1"> {{ props.profile.publicName }}</span>
            <EditField fieldName="publicName" :editComponent="PublicNameInput" />
          </div>
          <GenderPronounLabel :profile="props.profile" />
        </div>
        <div class="mb-2 text-muted d-inline-flex align-items-center">
          <span class="me-1">
            <LocationLabel :location="profile.location" />
          </span>
          <EditField fieldName="location" :editComponent="LocationSelector" />
        </div>

        <div class="mb-3">
          <div class="d-inline-block">
            <TagList :profile />
            <EditField fieldName="tags" :editComponent="TagSelectComponent" />
          </div>

          <div class="d-inline-flex align-items-center">
            <LanguageList :languages="profile.languages" />
            <EditField fieldName="languages" :editComponent="LanguageSelector" />
          </div>
        </div>
        <div class="mb-3">
          {{ props.profile.introSocial }}
          <EditField
            fieldName="introSocial"
            :editComponent="IntrotextEditor"
            :editProps="{
              languages: profile.languages,
              placeholder: t('profiles.forms.intro_placeholder'),
            }"
          />
        </div>

        <hr />

        <div class="mb-3">
          <div class="mb-3" v-if="props.profile.isDatingActive">
            {{ props.profile.introDating }}
            <EditField
              fieldName="introDating"
              :editComponent="IntrotextEditor"
              :editProps="{
                languages: profile.languages,
                placeholder: t('profiles.forms.intro_who_placeholder'),
              }"
            />
          </div>
        </div>
        <div class="mb-3">
          <RelationshipTags :profile="props.profile" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icons {
  position: absolute;
  top: 0.5rem;
  right: 1.5rem;
  z-index: 10;
}

.action-buttons {
  position: absolute;
  /* top: 10px; */
  /* bottom:2rem; */
  margin-top: -3rem;
  right: 1rem;
  z-index: 10;
  /* background-color: rgba(255, 255, 255, 0.8); */
}
</style>
