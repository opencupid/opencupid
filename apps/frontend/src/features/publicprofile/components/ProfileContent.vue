<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { type OwnerProfile, type PublicProfileWithContext } from '@zod/profile/profile.dto'

import ImageCarousel from './ImageCarousel.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
// Edit components
import EditField from '@/features/myprofile/components/EditField.vue'
import PublicNameInput from '@/features/shared/profileform/PublicNameInput.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import LanguageSelector from '@/features/shared/profileform/LanguageSelector.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
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
  wrapperClass?: string
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const viewerLocation = computed(() => viewerProfile?.value?.location)
</script>

<template>
  <div
    v-bind:class="props.wrapperClass"
    class="profile-content position-relative rounded-top overflow-hidden"
  >
    <div class="overflow-hidden carousel-wrapper">
      <ImageCarousel :profile />
    </div>

    <div class="icons">
      <!-- <DatingIcon :profile /> -->
    </div>

    <div class="action-buttons">
      <EditField
        fieldName="profileImages"
        buttonClass="btn-icon-lg btn-overlay photo-edit-button"
      >
        <IconPhoto class="svg-icon" />
        <template #editor="{ modelValue, onUpdate }">
          <ImageEditor :modelValue="modelValue" @update:modelValue="onUpdate" />
        </template>
      </EditField>
    </div>

    <div class="mx-3">
      <div class="d-flex flex-row align-items-center mt-2">
        <div class="flex-grow-1 d-inline-flex align-items-center">
          <span class="fw-bolder fs-2 me-1"> {{ props.profile.publicName }}</span>
          <EditField fieldName="publicName">
            <template #editor="{ modelValue, onUpdate }">
              <PublicNameInput :modelValue="modelValue" @update:modelValue="onUpdate" />
            </template>
          </EditField>
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
        <EditField fieldName="location">
          <template #editor="{ modelValue, onUpdate }">
            <LocationSelector :modelValue="modelValue" @update:modelValue="onUpdate" />
          </template>
        </EditField>
      </div>

      <div class="mb-3">
        <div class="d-inline-flex align-items-center flex-wrap">
          <TagList :tags="profile.tags" />
          <EditField fieldName="tags">
            <template #placeholder>
              <div
                class="editable-placeholder"
                v-if="!props.profile.tags?.length"
              >
                {{ t('profiles.forms.tags_placeholder') }}
              </div>
            </template>
            <template #editor="{ modelValue, onUpdate }">
              <TagSelector :modelValue="modelValue" @update:modelValue="onUpdate" />
            </template>
          </EditField>
        </div>

        <div class="d-inline-flex align-items-center">
          <LanguageList :languages="profile.languages" />
          <EditField fieldName="languages">
            <template #editor="{ modelValue, onUpdate }">
              <LanguageSelector :modelValue="modelValue" @update:modelValue="onUpdate" />
            </template>
          </EditField>
        </div>
      </div>
      <div class="mb-3">
        <EditField
          fieldName="introSocialLocalized"
          wrapper-class="editable-textarea"
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
          <template #editor="{ modelValue, onUpdate }">
            <IntrotextEditor
              :modelValue="modelValue"
              @update:modelValue="onUpdate"
              :languages="profile.languages"
              :placeholder="t('profiles.forms.intro_placeholder')"
            />
          </template>
        </EditField>
      </div>

      <div class="mb-3 dating-field">
        <div
          class="mb-3"
          v-if="props.profile.isDatingActive"
        >
          <span class="opacity-25">
            <hr />
          </span>
          <EditField
            fieldName="introDatingLocalized"
            wrapper-class="editable-textarea"
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
            <template #editor="{ modelValue, onUpdate }">
              <IntrotextEditor
                :modelValue="modelValue"
                @update:modelValue="onUpdate"
                :languages="profile.languages"
                :placeholder="t('profiles.forms.intro_who_placeholder')"
              />
            </template>
          </EditField>
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
  right: 1rem;
  z-index: 5;
}

.action-buttons {
  position: absolute;
  margin-top: -4rem;
  right: 1rem;
  z-index: 5;
}
</style>
