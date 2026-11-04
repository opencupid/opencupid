<script setup lang="ts">
import { ref } from 'vue'
import { BButton, BFormCheckbox, BPopover } from 'bootstrap-vue-next'
import { useI18n } from '@/lib/i18n'
import { USER_CONTENT_KINDS, type UserContentKind } from '@shared/maps'
import { useTimeoutFn } from '@vueuse/core'

import IconLayer from '@/assets/icons/interface/layer.svg'
import { CONTENT_KIND_DISPLAY } from '../utils/contentKinds'

const { t } = useI18n()

const model = defineModel<UserContentKind[]>({ required: true })

function toggle(kind: UserContentKind) {
  const current = model.value
  model.value = current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]
}

// The only-selected layer can't be deselected: backend rejects empty
// `kinds`. Disabling the checkbox makes the rule visible (greyed-out)
// instead of swallowing clicks silently.
function isLocked(kind: UserContentKind) {
  return model.value.length === 1 && model.value[0] === kind
}

const popoverRef = ref<InstanceType<typeof BPopover> | null>(null)
const POPOVER_AUTO_HIDE_MS = 3000

// Hover-driven auto-hide: timer counts while the cursor is outside the
// popover body, pauses while it's inside. Mouseleave starts a fresh
// 3-second deadline; mouseenter cancels it.
const { start: startHideTimer, stop: stopHideTimer } = useTimeoutFn(
  () => {
    popoverRef.value?.hide()
  },
  POPOVER_AUTO_HIDE_MS,
  { immediate: false }
)
</script>

<template>
  <div class="map-layer-control">
    <BPopover
      ref="popoverRef"
      placement="bottom"
      close-on-hide
      :boundary-padding="20"
      body-class="p-1"
      :title="t('map.layer_control.aria_label')"
    >
      <template #target>
        <BButton
          class="btn-rounded shadow btn btn-light"
          variant="outline-secondary"
          :aria-label="t('map.layer_control.aria_label')"
        >
          <IconLayer class="svg-icon" />
        </BButton>
      </template>
      <BRow
        cols="2"
        class="g-2 py-2 px-1 layer-control-grid"
        @mouseenter="stopHideTimer"
        @mouseleave="startHideTimer"
      >
        <BCol
          v-for="kind in USER_CONTENT_KINDS"
          :key="kind"
          class="text-center"
        >
          <BFormCheckbox
            button
            :button-variant="
              model.includes(kind)
                ? `outline-${CONTENT_KIND_DISPLAY[kind].color}`
                : 'outline-secondary'
            "
            size="lg"
            class="btn-layer-select"
            :model-value="model.includes(kind)"
            :disabled="isLocked(kind)"
            @update:model-value="toggle(kind)"
          >
            <component
              :is="CONTENT_KIND_DISPLAY[kind].icon"
              class="svg-icon-lg"
            />
            <div class="layer-label mt-1">{{ t(CONTENT_KIND_DISPLAY[kind].label) }}</div>
          </BFormCheckbox>
        </BCol>
      </BRow>
    </BPopover>
  </div>
</template>

<style scoped lang="scss">
.map-layer-control {
  user-select: none;
}
.layer-control-grid {
  width: 100%;
  margin: 0;
}
.btn-layer-select :deep(.btn) {
  width: 100%;
  padding-inline: 0.25rem;
}
.layer-label {
  font-size: 0.7rem;
  line-height: 1.1;
}
</style>
