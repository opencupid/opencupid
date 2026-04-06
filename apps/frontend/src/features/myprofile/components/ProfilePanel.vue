<script setup lang="ts">
import { provide, toRef, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ref } from 'vue'

import { useOwnerProfileStore } from '../stores/ownerProfileStore'
import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import { useMyProfileRouteState } from '../composables/useMyProfileRouteState'
import { LocationSchema } from '@zod/dto/location.dto'
import type { OwnerPost } from '@zod/post/post.dto'

import MyProfileView from './MyProfile.vue'
import SettingsView from '@/features/settings/components/Settings.vue'
import DatingPrefsView from './DatingPrefs.vue'
import DatingWizardView from './DatingWizard.vue'
import EditPostDialog from '@/features/posts/components/EditPostDialog.vue'
import PostList from '@/features/posts/components/PostList.vue'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import PanelHeader from './PanelHeader.vue'

defineOptions({ name: 'ProfilePanel' })


const router = useRouter()
const { subView, editingPostId } = useMyProfileRouteState()

const ownerProfileStore = useOwnerProfileStore()
const { formData } = useMyProfileViewModel(false)

// The full post object — set when navigating forward from PostList.
// If editingPostId is present but this ref is null (e.g. direct deep-link),
// we redirect to MePosts to avoid a broken edit state.
const editingPost = ref<OwnerPost | undefined>()
const defaultLocation = computed(() => LocationSchema.parse(formData?.location ?? {}))

watch(
  editingPostId,
  (postId) => {
    if (postId && !editingPost.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!postId) {
      editingPost.value = undefined
    }
  },
  { immediate: true }
)

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

function handleClose() {
  router.replace({ name: 'Browse' })
}

function openEditPost(post: OwnerPost) {
  editingPost.value = post
  router.push({ name: 'MeEditPost', params: { postId: post.id } })
}

function openCreatePost() {
  editingPost.value = undefined
  router.push({ name: 'MeCreatePost' })
}
</script>

<template>
  <!-- Shared header — persists across all sub-views -->
  <div class="offcanvas-header flex-shrink-0">
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
          editingPost ? $t('posts.edit_title') : $t('posts.create_title')
        }}</template>
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
    class="flex-shrink-0 d-flex align-items-center px-3"
  >
    <ul class="nav nav-tabs flex-grow-1">
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
    <BButton
      v-if="subView === 'myposts'"
      variant="link"
      size="sm"
      class="ms-2 p-0 flex-shrink-0"
      @click="openCreatePost"
    >
      {{ $t('posts.actions.create_cta_title') }}
    </BButton>
  </div>

  <!-- Content area -->
  <div class="flex-grow-1 overflow-auto">
    <MyProfileView
      v-if="subView === 'myprofile'"
      @datingmode:prefs="router.push({ name: 'MeDating' })"
      @datingmode:wizard="router.push({ name: 'MeDatingWizard' })"
    />
    <PostList
      v-else-if="subView === 'myposts'"
      scope="my"
      @intent:edit="openEditPost"
    />
    <EditPostDialog
      v-else-if="subView === 'editpost'"
      :post="editingPost"
      :is-edit="!!editingPost"
      :default-location="defaultLocation"
      @cancel="router.replace({ name: 'MePosts' })"
      @saved="router.replace({ name: 'MePosts' })"
    />
    <SettingsView
      v-else-if="subView === 'settings'"
      @close="handleClose"
    />
    <DatingPrefsView
      v-else-if="subView === 'datingprefs'"
      @close="router.replace({ name: 'Me' })"
    />
    <DatingWizardView
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
