<script setup lang="ts">
import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import { type ProfileScope } from '@zod/profile/profile.dto'

const currentScope = defineModel<ProfileScope | null>()
</script>

<template>
  <div class="btn-group btn-group-toggle" data-bs-toggle="buttons">
    <input
      type="radio"
      class="btn-check"
      name="options"
      id="social"
      autocomplete="off"
      :checked="currentScope === 'social'"
      @click="currentScope = 'social'"
    />
    <label class="social btn btn-outline-social" for="social"
      ><IconSocialize class="svg-icon-100"
    /></label>

    <input
      type="radio"
      class="btn-check"
      name="options"
      id="dating"
      autocomplete="off"
      :checked="currentScope === 'dating'"
      @click="currentScope = 'dating'"
    />
    <label class="dating btn btn-outline-dating" for="dating">
      <IconDate class="svg-icon-100" />
    </label>
  </div>
</template>

<style lang="scss" scoped>
.disabled {
  pointer-events: none;
  opacity: 0.5;
  cursor: default;
  filter: grayscale(100%);
}

.btn-group .btn {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  transition: all 0.5s ease;
}

$radius: 2rem;
.btn-group {
  height: 2.75rem;
}
.social {
  border-top-left-radius: $radius;
  border-bottom-left-radius: $radius;
}
.dating {
  border-top-right-radius: $radius;
  border-bottom-right-radius: $radius;
}
</style>
