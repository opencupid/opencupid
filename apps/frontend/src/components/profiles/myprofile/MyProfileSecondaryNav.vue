<script setup lang="ts">
import { computed } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import { type ViewState } from './types'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import ScopeViewToggler from '../ScopeViewToggler.vue'

const model = defineModel<ViewState>({
  default: {
    scopes: [],
    currentScope: 'dating',
  },
  required: true,
})

const languagePreviewOptions = useI18nStore().getAvailableLocalesWithLabels()

const currentLanguage = computed(() => {
  return languagePreviewOptions.find(lang => lang.value === model.value.previewLanguage)
})
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <ul pills class="nav nav-pills w-100 d-flex align-items-center">
      <li class="col-2">
        <slot name="items-left"></slot>
      </li>

      <li class="col-8 d-flex nav-item justify-content-center align-items-center">
        <ScopeViewToggler v-model="model"> </ScopeViewToggler>
      </li>

      <li class="col-2 d-flex justify-content-end">
        <BNavItemDropdown
          size="sm"
          id="my-nav-dropdown"
          text="Dropdown"
          toggle-class="nav-link-custom"
          right
        >
          <template #button-content>
            <IconGlobe class="svg-icon" />
            <!-- {{ currentLanguage?.label }} -->
          </template>
          <BDropdownItem
            v-for="lang in languagePreviewOptions"
            :key="lang.value"
            :active="lang.value === model.previewLanguage"
            @click="model.previewLanguage = lang.value"
          >
            {{ lang.label }}
          </BDropdownItem>
        </BNavItemDropdown>
      </li>
    </ul>
  </div>
</template>
