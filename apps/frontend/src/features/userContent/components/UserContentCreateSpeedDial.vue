<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons'

import SpeedDial from '@/features/shared/components/SpeedDial.vue'

import IconAdd from '@/assets/icons/interface/plus.svg'
import IconPost from '@/assets/icons/interface/post-it.svg'
import IconCommunity from '@/assets/icons/interface/community.svg'

defineEmits<{
  (e: 'create:post'): void
  (e: 'create:event'): void
  (e: 'create:community'): void
}>()
</script>

<template>
  <SpeedDial>
    <template #trigger>
      <BButton
        class="btn-icon-lg btn-shadow"
        variant="primary"
        :title="$t('posts.actions.create_cta_title')"
      >
        <IconAdd class="svg-icon" />
      </BButton>
    </template>
    <BButton
      class="btn-icon-lg btn-shadow btn-light rounded-circle"
      variant="outline-primary"
      :title="$t('posts.actions.create_advert_cta_title')"
      @click="$emit('create:post')"
    >
      <IconPost class="svg-icon" />
    </BButton>
    <BButton
      class="btn-icon-lg btn-shadow btn-light rounded-circle"
      variant="outline-primary"
      :title="$t('posts.actions.create_event_cta_title')"
      @click="$emit('create:event')"
    >
      <FontAwesomeIcon :icon="faCalendarPlus" />
    </BButton>
    <BButton
      class="btn-icon-lg btn-shadow btn-light rounded-circle"
      variant="outline-primary"
      :title="$t('posts.actions.create_community_cta_title')"
      @click="$emit('create:community')"
    >
      <IconCommunity class="svg-icon" />
    </BButton>
  </SpeedDial>
</template>
