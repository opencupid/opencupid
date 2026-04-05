<script setup lang="ts">
import { ref, provide, toRef } from 'vue'

import { useOwnerProfileStore } from '../stores/ownerProfileStore'
import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'

import MyProfileView from './MyProfile.vue'
import SettingsView from '@/features/settings/components/Settings.vue'
import DatingPrefsView from '../views/DatingPrefs.vue'
import DatingWizardView from '../views/DatingWizard.vue'
import PostList from '@/features/posts/components/PostList.vue'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import PanelHeader from './PanelHeader.vue'

defineOptions({ name: 'ProfilePanel' })

const emit = defineEmits<{
  (e: 'close'): void
}>()

const profileSubView = ref<'myprofile' | 'myposts' | 'settings' | 'datingprefs' | 'datingwizard'>('myprofile')

const ownerProfileStore = useOwnerProfileStore()
const { formData } = useMyProfileViewModel(false)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

const handleClose = () => {
  emit('close')
  setTimeout(() => {
    profileSubView.value = 'myprofile'
  }, 2000)
}
</script>

<template>
  <!-- Shared header — persists across all sub-views -->
  <div class="offcanvas-header flex-shrink-0">
    <template v-if="profileSubView === 'settings'">
      <PanelHeader @back="profileSubView = 'myprofile'">
        <template #title>{{ $t('settings.title') }}</template>
      </PanelHeader>
    </template>
    <template v-else-if="profileSubView === 'datingprefs'">
      <PanelHeader @back="profileSubView = 'myprofile'">
        <template #title>{{ $t('profiles.forms.my_dating_profile') }}</template>
      </PanelHeader>
    </template>
    <template v-else-if="profileSubView === 'datingwizard'">
      <PanelHeader @back="profileSubView = 'myprofile'">
        <template #title>{{ $t('onboarding.wizard.dating_modal_title') }}</template>
      </PanelHeader>
    </template>
    <template v-else>
      <span class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
        <span
          v-if="ownerProfileStore.profile?.profileImages?.length"
          class="owner-profile-avatar flex-shrink-0 overflow-hidden rounded-circle"
        >
          <ProfileImage
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
        @click="profileSubView = 'settings'"
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
    v-if="profileSubView === 'myprofile' || profileSubView === 'myposts'"
    class="flex-shrink-0"
  >
    <ul class="nav nav-tabs w-100 px-3">
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: profileSubView === 'myprofile' }"
          @click="profileSubView = 'myprofile'"
        >
          {{ $t('profiles.forms.tab_profile') }}
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: profileSubView === 'myposts' }"
          @click="profileSubView = 'myposts'"
        >
          {{ $t('profiles.forms.tab_posts') }}
        </button>
      </li>
    </ul>
  </div>

  <!-- Content area -->
  <div class="flex-grow-1 overflow-auto">
    <MyProfileView
      v-if="profileSubView === 'myprofile'"
      @datingmode:prefs="profileSubView = 'datingprefs'"
      @datingmode:wizard="profileSubView = 'datingwizard'"
    />
    <PostList
      v-else-if="profileSubView === 'myposts'"
      scope="my"
    />
    <SettingsView
      v-else-if="profileSubView === 'settings'"
      @close="emit('close')"
    />
    <DatingPrefsView
      v-else-if="profileSubView === 'datingprefs'"
      @close="profileSubView = 'myprofile'"
    />
    <DatingWizardView
      v-else-if="profileSubView === 'datingwizard'"
      @close="profileSubView = 'myprofile'"
    />
  </div>
</template>

<style scoped>
.owner-profile-avatar {
  width: 2rem;
  height: 2rem;
}
</style>
