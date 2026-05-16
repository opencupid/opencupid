<script setup lang="ts">
import { provide } from 'vue'
import { useRouter } from 'vue-router'

import { useOwnerProfileStore } from '../stores/ownerProfileStore'
import { useMyProfileRouteState } from '../composables/useMyProfileRouteState'

import MyProfile from './MyProfile.vue'
import PanelHeader from './PanelHeader.vue'
import DatingPrefs from './DatingPrefs.vue'
import DatingWizard from './DatingWizard.vue'

import Settings from '@/features/settings/components/Settings.vue'
import GalleryImage from '@/features/images/components/GalleryImage.vue'
import PostsOrchestrator from '@/features/posts/components/PostsOrchestrator.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'

defineOptions({ name: 'ProfilePanel' })

const router = useRouter()
const { subView } = useMyProfileRouteState()

const ownerProfileStore = useOwnerProfileStore()

provide('isOwner', true)

function handleClose() {
  router.replace({ name: 'Browse' })
}
</script>

<template>
  <!-- Shared header — persists across all sub-views -->
  <div class="offcanvas-header flex-shrink-0 flex-grow-0">
    <template v-if="subView === 'settings'">
      <PanelHeader @back="router.replace({ name: 'Me' })">
        <template #title>{{ $t('settings.title') }}</template>
      </PanelHeader>
    </template>
    <template v-else-if="subView === 'datingprefs'">
      <PanelHeader @back="router.replace({ name: 'Me' })">
        <template #title>{{ $t('profiles.forms.my_dating_profile') }}</template>
      </PanelHeader>
    </template>
    <template v-else-if="subView === 'datingwizard'">
      <PanelHeader @back="router.replace({ name: 'Me' })">
        <template #title>{{ $t('onboarding.wizard.dating_modal_title') }}</template>
      </PanelHeader>
    </template>
    <template v-else-if="subView === 'editpost'">
      <PanelHeader @back="router.replace({ name: 'MePosts' })">
        <template #title>{{
          $route.name === 'MeEditPost' ? $t('posts.edit_title') : $t('posts.create_title')
        }}</template>
      </PanelHeader>
    </template>
    <template v-else>
      <span class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
        <span
          v-if="ownerProfileStore.profile?.profileImages?.length"
          class="owner-profile-avatar flex-shrink-0 overflow-hidden rounded-circle"
        >
          <GalleryImage
            :profile="ownerProfileStore.profile"
            variant="thumb"
            class="img-fluid w-100 h-100"
          />
        </span>
        <span
          id="ownerDrawerLabel"
          class="offcanvas-title text-truncate"
        >
          {{ ownerProfileStore.profile?.publicName }}
        </span>
      </span>
      <BButton
        variant="link-secondary"
        class="p-0 ms-2 flex-shrink-0"
        :aria-label="$t('settings.title')"
        @click="router.push({ name: 'MeSettings' })"
      >
        <IconSetting2 class="svg-icon" />
      </BButton>
    </template>
    <button
      type="button"
      class="btn-close ms-2"
      :aria-label="$t('common.close')"
      @click="handleClose"
    />
  </div>

  <!-- Tab bar — hidden in non-main sub-views -->
  <div
    v-if="subView === 'myprofile' || subView === 'myposts'"
    class="flex-shrink-0 flex-grow-0 d-flex align-items-center justify-content-center"
  >
    <ul
      class="nav nav-tabs flex-grow-0 flex-shrink-0 w-100 d-flex justify-content-center"
      role="tablist"
    >
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: subView === 'myprofile' }"
          @click="router.replace({ name: 'Me' })"
        >
          {{ $t('profiles.forms.tab_profile') }}
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: subView === 'myposts' }"
          @click="router.replace({ name: 'MePosts' })"
        >
          {{ $t('profiles.forms.tab_posts') }}
        </button>
      </li>
    </ul>
  </div>

  <!-- Content area -->
  <div class="d-flex flex-grow-1 flex-shrink-1 overflow-hidden">
    <MyProfile
      v-if="subView === 'myprofile'"
      @datingmode:prefs="router.push({ name: 'MeDating' })"
      @datingmode:wizard="router.push({ name: 'MeDatingWizard' })"
    />

    <PostsOrchestrator
      v-else-if="
        subView === 'myposts' ||
        subView === 'editpost' ||
        subView === 'editevent' ||
        subView === 'editcommunity'
      "
    />

    <Settings
      v-else-if="subView === 'settings'"
      @close="handleClose"
    />
    <DatingPrefs
      v-else-if="subView === 'datingprefs'"
      @close="router.replace({ name: 'Me' })"
    />
    <DatingWizard
      v-else-if="subView === 'datingwizard'"
      @close="router.replace({ name: 'Me' })"
    />
  </div>
</template>

<style scoped>
.owner-profile-avatar {
  width: 2rem;
  height: 2rem;
}
</style>
