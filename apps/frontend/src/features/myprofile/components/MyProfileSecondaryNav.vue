<script setup lang="ts">
import { computed, inject, type Ref, ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import { type ViewState } from '../composables/types'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconViewAs from '@/assets/icons/interface/unhide.svg'
import IconHeart from '@/assets/icons/interface/heart.svg'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSliders } from '@fortawesome/free-solid-svg-icons'

import { type OwnerProfile } from '@zod/profile/profile.dto'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'
import DatingPrefsDisplay from '@/features/browse/components/DatingPrefsDisplay.vue'
// TODO refactor - we no longer need viewState
// replace this formData.isDatingActive from parent -> datingMode bool - other TODOs below
// refer to it to implement gates.
const model = defineModel<ViewState>({
  default: {
    scopes: [],
    currentScope: 'dating',
  },
  required: true,
})

const datingPrefs = defineModel<DatingPreferencesDTO | null>('datingPrefs', {
  default: null,
})

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
  (e: 'datingmode:prefs'): void
}>()

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile')

const i18nStore = useI18nStore()

const languagePreviewOptions = computed(() => {
  return i18nStore.getLanguageLabels(viewerProfile?.value.languages || [])
})

const currentLanguage = computed(() => {
  return languagePreviewOptions.value.find((lang) => lang.value === model.value.previewLanguage)
})
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <BNav pills>
      <!-- Settings -->
      <BNavItem
        to="/settings"
        class="p-0"
      >
        <BButton variant="outline-secondary">
          <IconSetting2 class="svg-icon-lg" />
        </BButton>
      </BNavItem>

      <!-- View as -->
      <BNavItemDropdown
        toggle-class="nav-link-custom"
        :auto-close="false"
      >
        <!-- TODO set props to render the same as BNavItem -> BButton -> IconSetting2 above
            as per canonical bootstrep vue 
            this gets different variant or such
            -->
        <template #button-content>
          <IconViewAs class="svg-icon-lg" />
        </template>
        <BDropdownItem>
          <ScopeViewToggler v-model="model.currentScope" />
        </BDropdownItem>
        <BDropdownDivider />
        <!-- TODO extract into component -->
        <BDropdownGroup
          v-if="languagePreviewOptions.length > 1"
          header="Lang"
        >
          <BDropdownItemButton
            v-for="lang in languagePreviewOptions"
            :key="lang.value"
            :active="lang.value === model.previewLanguage"
            @click="model.previewLanguage = lang.value"
          >
            <span class="d-flex align-items-center">
              <span class="flex-grow-1">{{ lang.label }}</span>
              <LanguageIcon
                :countryCode="lang.value"
                :size="24"
              />
            </span>
          </BDropdownItemButton>
        </BDropdownGroup>
      </BNavItemDropdown>

      <!-- Preferences -->
      <!-- TODO extract into separate component -->
      <BNavItemDropdown
        :auto-close="'outside'"
      >
        <template #button-content>
          <!-- TODO add status  -->
          <IconHeart
            class="svg-icon-lg"
            
          />
        </template>

        <BDropdownItemButton
          style="min-width: 15rem"
          @click.stop="$emit('datingmode:toggle')"
        >
          <span class="d-flex align-items-center justify-content-between">
            <BFormCheckbox
              switch
              :model-value="isDatingActive"
              tabindex="-1"
              style="pointer-events: none"
            />
            <span>Dating mode</span>
          </span>
        </BDropdownItemButton>

        <!-- TODO only show is datingmode true -->
        <BDropdownDivider v-if="isDatingActive" />
        <!-- TODO only show is datingmode true -->
        <BDropdownItemButton
          v-if="isDatingActive"
          @click="$emit('datingmode:prefs')"
        >
          <FontAwesomeIcon :icon="faSliders" />
          My preferences
        </BDropdownItemButton>
      </BNavItemDropdown>
    </BNav>
  </div>
</template>

<style scoped>
:deep(button:after) {
  content: none !important;
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.circle-flags {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  flex-shrink: 1;
}
</style>
