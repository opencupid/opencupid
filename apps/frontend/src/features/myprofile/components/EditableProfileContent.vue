<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { type PublicProfile } from '@zod/profile/profile.dto'

import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import EditField from './EditField.vue'
import PublicNameInput from '@/features/shared/profileform/PublicNameInput.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import LanguageSelector from '@/features/shared/profileform/LanguageSelector.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import { useProfileImageStore } from '@/features/images/stores/profileImageStore'

const { t } = useI18n()

const props = defineProps<{
  profile: PublicProfile
}>()

const profileImageStore = useProfileImageStore()
</script>

<template>
  <ProfileContent :profile="props.profile">
    <template #photo-edit>
      <EditField
        fieldName="profileImages"
        :editComponent="ImageEditor"
        :editProps="{ store: profileImageStore, minImages: 1 }"
        buttonClass="btn-icon-lg btn-overlay photo-edit-button"
      >
        <IconPhoto class="svg-icon" />
      </EditField>
    </template>

    <template #name-edit>
      <EditField
        fieldName="publicName"
        :editComponent="PublicNameInput"
      />
    </template>

    <template #location-edit>
      <EditField
        fieldName="location"
        :editComponent="LocationSelector"
      />
    </template>

    <template #tags-edit>
      <EditField
        fieldName="tags"
        :editComponent="TagSelector"
      >
        <template #placeholder>
          <div
            class="editable-placeholder"
            v-if="!props.profile.tags?.length"
          >
            {{ t('profiles.forms.tags_placeholder') }}
          </div>
        </template>
      </EditField>
    </template>

    <template #languages-edit>
      <EditField
        fieldName="languages"
        :editComponent="LanguageSelector"
      />
    </template>

    <template #intro-social>
      <EditField
        fieldName="introSocialLocalized"
        :editComponent="IntrotextEditor"
        wrapper-class="editable-textarea"
        :editProps="{
          languages: props.profile.languages,
          placeholder: t('profiles.forms.intro_placeholder'),
        }"
      >
        <template #display>
          {{ props.profile.introSocial }}
        </template>
        <template #placeholder>
          <div class="editable-placeholder">
            <span v-if="!props.profile.introSocial">
              {{ t('profiles.forms.intro_placeholder') }}
            </span>
            <span v-else>
              {{ props.profile.introSocial }}
            </span>
          </div>
        </template>
      </EditField>
    </template>

    <template #intro-dating>
      <EditField
        fieldName="introDatingLocalized"
        :editComponent="IntrotextEditor"
        wrapper-class="editable-textarea"
        :editProps="{
          languages: props.profile.languages,
          placeholder: t('profiles.forms.intro_who_placeholder'),
        }"
      >
        <template #display>
          {{ props.profile.introDating }}
        </template>
        <template #placeholder>
          <div class="editable-placeholder">
            <span v-if="!props.profile.introDating">
              {{ t('profiles.forms.intro_who_placeholder') }}
            </span>
            <span v-else>
              {{ props.profile.introDating }}
            </span>
          </div>
        </template>
      </EditField>
    </template>
  </ProfileContent>
</template>
