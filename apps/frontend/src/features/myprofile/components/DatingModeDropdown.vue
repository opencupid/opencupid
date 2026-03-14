<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconSlider from '@/assets/icons/interface/setting.svg'
import IconProfile from '@/assets/icons/interface/user.svg'

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
  (e: 'datingmode:prefs'): void
}>()
</script>

<template>
  <BNavItemDropdown
    toggle-class="btn-link-warning"
    :auto-close="'outside'"
  >
    <template #button-content>
      <span :class="{ 'text-dating': isDatingActive, 'text-secondary': !isDatingActive }">
        <IconHeart class="svg-icon-lg" />
      </span>
    </template>

    <BDropdownItemButton
      style="min-width: 15rem"
      @click.stop="$emit('datingmode:toggle')"
    >
      <span class="d-flex align-items-center justify-content-start">
        <BFormCheckbox
          switch
          :model-value="isDatingActive"
          tabindex="-1"
          style="pointer-events: none"
        />
        <span>{{ $t('profiles.forms.dating_mode') }}</span>
      </span>
    </BDropdownItemButton>
    <BDropdownText>
      <div class="form-hint lh-sm">
        {{ $t('profiles.forms.dating_mode_toggle_hint') }}
      </div>
    </BDropdownText>
    <BCollapse v-model="isDatingActive">
      <BDropdownDivider />
      <!-- <BDropdownItemButton @click="$emit('datingmode:profile')">
        <IconProfile class="svg-icon me-2" />
        {{ $t('profiles.forms.my_preferences') }} // TODO clean up this key
      </BDropdownItemButton> -->

      <BDropdownItemButton @click="$emit('datingmode:prefs')">
        <IconSlider class="svg-icon me-2" />
        {{ $t('profiles.forms.my_dating_profile') }}
      </BDropdownItemButton>
    </BCollapse>
  </BNavItemDropdown>
</template>
