<script setup lang="ts">
import { computed } from 'vue'

import BlurhashImage from './BlurhashImage.vue'
import EmptyProfilePhoto from './EmptyProfilePhoto.vue'
import HiddenProfilePhoto from './HiddenProfilePhoto.vue'
import { type ImageVariant } from '@zod/image/image.dto'
import { type VariantName } from './types'
import { useProfilePhotoAccess } from '../composables/useProfilePhotoAccess'

// Props & Emits
const props = defineProps<{
  variant?: VariantName
  profile: {
    id: string
    profileImages: { variants: ImageVariant[]; blurhash?: string | null }[]
  }
}>()

const emit = defineEmits<{ load: [] }>()

const image = computed(() => props.profile.profileImages[0])

const { canSeePhotosOf } = useProfilePhotoAccess()
const isHidden = computed(() => !canSeePhotosOf(props.profile))

// The photo's wrapper carries .profile-image and is rounded like the photo
// (see .profile-thumbnail), so the blurhash behind it can't peek out around
// rounded corners. Keep the template free of comments: they would turn the
// root into a fragment and stop attrs (e.g. classes) falling through.
</script>

<template>
  <EmptyProfilePhoto
    v-if="!image"
    class="img-fluid rounded"
    @load="emit('load')"
  />
  <HiddenProfilePhoto
    v-else-if="isHidden"
    :photo="image"
    className="img-fluid rounded"
    @load="emit('load')"
  />
  <BlurhashImage
    v-else
    class="profile-image rounded"
    :image="image"
    :variant="props.variant"
    imgClass="img-fluid rounded"
    @load="emit('load')"
  />
</template>
