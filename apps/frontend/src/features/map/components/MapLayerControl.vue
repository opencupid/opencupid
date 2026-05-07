<script setup lang="ts">
import { BButton, BFormCheckbox, BPopover } from 'bootstrap-vue-next'
import { useI18n } from '@/lib/i18n'
import type { UserContentKind } from '@shared/maps'

import IconLayer from '@/assets/icons/interface/layer.svg'
import IconProfile from '@/assets/icons/interface/user.svg'
import IconPost from '@/assets/icons/interface/post-it.svg'

const { t } = useI18n()

const model = defineModel<UserContentKind[]>({ required: true })

function toggle(kind: UserContentKind) {
  const current = model.value
  model.value = current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]
}
</script>

<template>
  <div class="map-layer-control">
    <BPopover
      click
      placement="left"
      :title="t('map.layer_control.aria_label')"
    >
      <template #target>
        <BButton
          class="btn-rounded rounded-circle shadow"
          variant="outline-secondary"
          :aria-label="t('map.layer_control.aria_label')"
        >
          <IconLayer class="svg-icon" />
        </BButton>
      </template>
      <div class="d-flex gap-3 py-2 px-1">
        <div class="text-center">
          <BFormCheckbox
            button
            variant="outline-primary"
            size="lg"
            class="btn-layer-select"
            :model-value="model.includes('profile')"
            @click="toggle('profile')"
          >
            <IconProfile class="svg-icon-lg" />
          </BFormCheckbox>
          <div class="form-hint mt-1">{{ t('map.layer_control.people') }}</div>
        </div>
        <div class="text-center">
          <BFormCheckbox
            button
            variant="outline-primary"
            size="lg"
            class="btn-layer-select"
            :model-value="model.includes('post')"
            @click="toggle('post')"
          >
            <IconPost class="svg-icon-lg" />
          </BFormCheckbox>
          <div class="form-hint mt-1">{{ t('map.layer_control.posts') }}</div>
        </div>
      </div>
    </BPopover>
  </div>
</template>

<style scoped>
.map-layer-control {
  user-select: none;
}
.btn-layer-select {
}
</style>
