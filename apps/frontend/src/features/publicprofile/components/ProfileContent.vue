<script lang="ts" setup>
import { inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { type OwnerProfile, type PublicProfileWithContext } from '@zod/profile/profile.dto'

import ImageCarousel from './ImageCarousel.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
// Edit components
import EditField from '@/features/myprofile/components/EditField.vue'
import PublicNameInput from '@/features/shared/profileform/PublicNameInput.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import LanguageSelector from '@/features/shared/profileform/LanguageSelector.vue'
import TagSelectComponent from '@/features/shared/profileform/TagSelectComponent.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import GenderPronounLabel from '@/features/shared/profiledisplay/GenderPronounLabel.vue'
import RelationshipTags from '@/features/shared/profiledisplay/RelationshipTags.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import ImageEditor from '@/features/images/components/ImageEditor.vue'

const { t } = useI18n()

const props = defineProps<{
  profile: PublicProfileWithContext
  isLoading: boolean
  wrapperClass?: string
}>()

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile') 
const viewerLocation = ref(viewerProfile?.value.location)
</script>

<template>
  <div v-bind:class="props.wrapperClass" class="profile-content position-relative rounded-top overflow-hidden">
    <div class="overflow-hidden carousel-wrapper">
      <ImageCarousel :profile />
    </div>

    <div class="icons">
      <!-- <DatingIcon :profile /> -->
    </div>

    <div class="action-buttons">
      <EditField
        fieldName="profileImages"
        :editComponent="ImageEditor"
        buttonClass="btn-icon-lg btn-overlay photo-edit-button"
      >
        <IconPhoto class="svg-icon" />
      </EditField>
    </div>

    <div class="mx-3">
      <div class="d-flex flex-row align-items-center mt-2">
        <div class="flex-grow-1 d-inline-flex align-items-center">
          <span class="fw-bolder fs-2 me-1"> {{ props.profile.publicName }}</span>
          <EditField fieldName="publicName" :editComponent="PublicNameInput" />
        </div>
        <GenderPronounLabel :profile="props.profile" />
      </div>
      <div class="mb-2 text-muted d-inline-flex align-items-center">
        <span class="me-1">
          <LocationLabel
            :viewerLocation="viewerLocation"
            :location="profile.location"
            :showCity="true"
            :showCountryLabel="true"
            :showCountryIcon="false"
          />
        </span>
        <EditField fieldName="location" :editComponent="LocationSelector" />
      </div>

      <div class="mb-3">
        <div class="d-inline-block">
          <TagList :tags="profile.tags" />
          <EditField fieldName="tags" :editComponent="TagSelectComponent">
            <template #display>
              <div class="editable-placeholder" v-if="!props.profile.tags?.length">
                {{ t('profiles.forms.tags_placeholder') }}
              </div>
            </template>
          </EditField>
        </div>

        <div class="d-inline-flex align-items-center">
          <LanguageList :languages="profile.languages" />
          <EditField fieldName="languages" :editComponent="LanguageSelector" />
        </div>
      </div>
      <div class="mb-3">
        {{ props.profile.introSocial }}
        <EditField
          fieldName="introSocialLocalized"
          :editComponent="IntrotextEditor"
          wrapper-class="editable-textarea"
          :editProps="{
            languages: profile.languages,
            placeholder: t('profiles.forms.intro_placeholder'),
          }"
        >
          <template #display>
            <div class="editable-placeholder" v-if="!props.profile.introSocial">
              {{ t('profiles.forms.intro_placeholder') }}
            </div>
          </template>
        </EditField>
      </div>

      <div class="mb-3">
        <div class="mb-3 dating-field" v-if="props.profile.isDatingActive">
          <span class="opacity-25">
            <hr />
          </span>
          {{ props.profile.introDating }}
          <EditField
            fieldName="introDatingLocalized"
            :editComponent="IntrotextEditor"
            wrapper-class="editable-textarea"
            :editProps="{
              languages: profile.languages,
              placeholder: t('profiles.forms.intro_who_placeholder'),
            }"
          >
            <template #display>
              <div class="editable-placeholder" v-if="!props.profile.introDating">
                {{ t('profiles.forms.intro_who_placeholder') }}
              </div>
            </template>
          </EditField>
        </div>
      </div>
      <div class="mb-3">
        <RelationshipTags :profile="props.profile" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.icons {
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  z-index: 5;
}

.action-buttons {
  position: absolute;
  margin-top: -4rem;
  right: 1rem;
  z-index: 5;
}
.carousel-wrapper {
  height: 50vh;
}
</style>
