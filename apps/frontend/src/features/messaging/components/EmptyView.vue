<script setup lang="ts">
import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'
</script>

<template>
  <BContainer class="d-flex flex-column justify-content-center h-100">
    <ViewTitle
      :icon="IconMessage"
      class="text-primary"
    >
      {{ $t('messaging.page_title') }}
    </ViewTitle>

    <p class="text-muted mb-4 mt-4 text-center">
      {{ $t('messaging.no_messages_placeholder') }}
    </p>
    <BButton
      variant="primary"
      size="lg"
      pill
      @click="$router.push({ name: 'BrowseProfiles' })"
    >
      <IconSearch class="svg-icon" />
      {{ $t('messaging.no_messages_cta') }}
    </BButton>
  </BContainer>
</template>
