<script setup lang="ts">
import { useRouter } from 'vue-router'
import PublicProfileComponent from '../components/PublicProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const props = defineProps<{ profileId: string }>()
const router = useRouter()

const handleBack = () => {
  router.back()
}

const handleMessage = (conversationId: string) => {
  router.push({ name: 'Messaging', params: { conversationId } })
}

const handleHidden = () => {
  router.back()
}
</script>

<template>
  <main class="w-100 overflow-auto hide-scrollbar public-profile-view">
    <MiddleColumn
      class="pt-sm-3 position-relative flex-grow-1"
      style="min-height: 100%"
    >
      <PublicProfileComponent
        :id="profileId"
        class="shadow-lg mb-3 pb-5"
        @intent:back="handleBack"
        @intent:message="handleMessage"
        @hidden="handleHidden"
      />
    </MiddleColumn>
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.public-profile-view {
  height: 100dvh;

  @include media-breakpoint-up(sm) {
    height: calc(100vh - $navbar-height);
  }
}
</style>
