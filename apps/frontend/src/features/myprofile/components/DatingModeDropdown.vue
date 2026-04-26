<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconSlider from '@/assets/icons/interface/setting.svg'
import IconProfile from '@/assets/icons/interface/user.svg'
import { ref } from 'vue'

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
}>()

const expand = ref(false)
const popoverOpen = ref(false)
const pillRef = ref<HTMLElement>()

function expandPill() {
  expand.value = true
  popoverOpen.value = true
  // Fire-and-forget auto-close — hint popover shouldn't linger forever.
  setTimeout(() => {
    popoverOpen.value = false
  }, 10_000)
}

function collapsePill() {
  popoverOpen.value = false
  expand.value = false
}

function toggleExpand() {
  if (expand.value) collapsePill()
  else expandPill()
}
</script>

<template>
  <div>
    <div
      class="d-flex"
      ref="pillRef"
    >
      <div
        class="expand-pill d-flex align-items-center"
      >
        <BButton variant="link">
          <span :class="{ 'text-dating': isDatingActive, 'text-secondary': !isDatingActive }">
            <IconHeart class="svg-icon-lg" />
          </span>
        </BButton>

        <div
          class="expand-grid expanded"
          @click.stop
        >
          <div class="expand-grid-inner px-1">
            <BFormCheckbox
              switch
              :model-value="isDatingActive"
              @update:model-value="$emit('datingmode:toggle')"
              tabindex="-1"
            >
              <span>{{ $t('profiles.forms.dating_mode') }}</span>
            </BFormCheckbox>
          </div>
        </div>
      </div>
    </div>
    <BPopover
      :target="pillRef"
      v-model="popoverOpen"
      placement="top"
      manual
      :delay="{ show: 1000, hide: 0 }"
    >
      <small class="lh-sm">{{ $t('profiles.forms.dating_mode_toggle_hint') }}</small>
    </BPopover>
  </div>
</template>

<style scoped>
.expand-pill {
  border-radius: 9999px;
  background-color: white;
  overflow: hidden;
  white-space: nowrap;
}

.expand-grid {
  display: grid;
  grid-template-columns: 0fr;
  transition: grid-template-columns 0.3s ease;
  overflow: hidden;
}

.expand-grid.expanded {
  grid-template-columns: 1fr;
}

.expand-grid-inner {
  min-width: 0;
}
</style>
