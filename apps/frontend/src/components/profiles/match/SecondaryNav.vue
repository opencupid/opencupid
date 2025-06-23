<script setup lang="ts">

import IconSetting from '@/assets/icons/interface/setting.svg'
import ScopeViewToggler from '../ScopeViewToggler.vue'
import { type FindMatchViewModel } from './types'

const model = defineModel<FindMatchViewModel>()

defineEmits({
  'edit:datingPrefs': () => true,
})

</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <ul pills class="nav nav-pills w-100 d-flex align-items-center">
      <li class="col-2">
        <slot name="items-left"></slot>
      </li>

      <li class="col-8 d-flex nav-item justify-content-center align-items-center">
        <ScopeViewToggler v-model="model" v-if="model?.scopes?.length! > 0" />
      </li>

      <li class="col-2 d-flex justify-content-end">
        <BButton variant="primary" class="ms-2" @click="$emit('edit:datingPrefs')">
          <IconSetting class="svg-icon" />
        </BButton>
      </li>
    </ul>
  </div>
</template>
