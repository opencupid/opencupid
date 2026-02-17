<script setup lang="ts">
import { computed, inject, type Ref, ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import { type ViewState } from '../composables/types'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import { type OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<ViewState>({
  default: {
    scopes: [],
    currentScope: 'dating',
  },
  required: true,
})

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
    <ul
      pills
      class="nav nav-pills w-100 d-flex align-items-center"
    >
      <li class="col-2 d-flex align-items-center">
        <BNavItem
          to="/settings"
          class="p-0"
        >
          <BButton
            variant="link-secondary"
            class="p-0"
          >
            <IconSetting2 class="svg-icon-lg" />
          </BButton>
        </BNavItem>
      </li>
      <li class="col-8 d-flex nav-item justify-content-center align-items-center">
        <ScopeViewToggler v-model="model.currentScope" />
      </li>

      <li class="col-2 d-flex justify-content-end">
        <BNavItemDropdown
          v-if="languagePreviewOptions.length > 1"
          size="sm"
          id="my-nav-dropdown"
          text="Dropdown"
          toggle-class="nav-link-custom"
          right
        >
          <template #button-content>
            <LanguageIcon
              v-if="currentLanguage"
              :countryCode="currentLanguage.value"
            />
          </template>
          <BDropdownItem
            v-for="lang in languagePreviewOptions"
            :key="lang.value"
            :active="lang.value === model.previewLanguage"
            @click="model.previewLanguage = lang.value"
          >
            <span class="d-flex align-items-center">
              <span class="flex-grow-1">{{ lang.label }}</span>
              <LanguageIcon :countryCode="lang.value" />
            </span>
          </BDropdownItem>
        </BNavItemDropdown>
      </li>
    </ul>
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
