<script setup lang="ts">
import { computed } from 'vue'

import ImageEditor from '@/features/images/components/ImageEditor.vue'
import PhotoFaceWarning from '@/features/images/components/PhotoFaceWarning.vue'
import { useProfileImageStore } from '@/features/images/stores/profileImageStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

// Gallery edits save immediately, so unlike onboarding there is no step to
// confirm: the warning simply stays visible while the profile has no face photo.
const profileImageStore = useProfileImageStore()
const ownerProfileStore = useOwnerProfileStore()

const hasFace = computed(() => ownerProfileStore.profile?.hasFace === true)
const hasPhoto = computed(() => profileImageStore.images.length > 0)
</script>

<template>
  <div class="w-100">
    <ImageEditor
      :store="profileImageStore"
      :minImages="0"
    />
    <PhotoFaceWarning
      v-if="!hasFace"
      :has-photo="hasPhoto"
    />
  </div>
</template>
