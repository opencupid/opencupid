<script setup lang="ts">
import ProfileCardComponent from './ProfileCardComponent.vue'
import { type PublicProfile } from '@zod/profile/profile.dto'

defineProps<{
  profiles: PublicProfile[]
  showTags?: boolean
  showLocation?: boolean
}>()

defineEmits<{
  (event: 'profile:select', id: string): void
}>()
</script>

<template>
  <BContainer fluid>
    <BRow v-bind="{ cols: 2, 'cols-sm':3,'cols-md': 4, 'cols-lg': 3, 'cols-xl': 4,'gutter-y': 4 }">
      <BCol
        v-for="profile in profiles"
        :key="profile.id"
        class="col"
      >
        <ProfileCardComponent
          :profile
          v-bind="{ showTags: $props.showTags, showLocation: $props.showLocation }"
          @click="$emit('profile:select', profile.id)"
        />
      </BCol>
    </BRow>
  </BContainer>
</template>
