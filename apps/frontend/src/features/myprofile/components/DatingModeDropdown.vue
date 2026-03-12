<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconSlider from '@/assets/icons/interface/setting.svg'
import IconProfile from '@/assets/icons/interface/user.svg'

const props = defineProps<{
  isDatingOnboarded?: boolean
}>()

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
  (e: 'datingmode:prefs'): void
  (e: 'datingmode:profile'): void
}>()
</script>

<template>
  <BNavItemDropdown
    class="btn-link-secondary"
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

    <BCollapse v-model="isDatingActive">
      <BDropdownDivider />
      <BDropdownItemButton @click="$emit('datingmode:profile')">
        <IconProfile class="svg-icon me-2" />
        {{ $t('profiles.forms.my_dating_profile') }}
      </BDropdownItemButton>

      <BDropdownItemButton
        @click="$emit('datingmode:prefs')"
        :disabled="!isDatingOnboarded"
      >
        <IconSlider class="svg-icon me-2" />
        {{ $t('profiles.forms.my_preferences') }}
      </BDropdownItemButton>
    </BCollapse>
  </BNavItemDropdown>
</template>
