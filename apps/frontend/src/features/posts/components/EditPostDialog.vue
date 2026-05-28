<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import type { OwnerPost } from '@zod/post/post.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { PostTypeSchema } from '@zod/generated'

const POST_CONTENT_MAX_LENGTH = 300

const PostFormSchema = z.object({
  type: PostTypeSchema.default('OFFER'),
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  location: LocationSchema,
})
type PostForm = z.infer<typeof PostFormSchema>

import PostIt from '@/features/shared/ui/PostIt.vue'
import PostTypeBadge from './PostTypeBadge.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
import VisibilityToggle from '@/features/shared/ui/VisibilityToggle.vue'

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', post: OwnerPost): void
}

interface Props {
  post?: OwnerPost
  isEdit: boolean
  defaultLocation: LocationDTO
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
})

const emit = defineEmits<Emits>()

const contentStore = useUserContentStore()

const post = props.post

const form = ref<PostForm>(
  PostFormSchema.parse({
    ...post,
    location: post?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)
const imageBtn = ref<InstanceType<typeof AttachImageButton> | null>(null)

const isFormValid = computed(() => {
  return (
    form.value.content.trim().length > 10 && form.value.content.length <= POST_CONTENT_MAX_LENGTH
  )
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true

  try {
    const { content, type, isVisible, location } = form.value

    const result =
      props.isEdit && post
        ? await contentStore.updatePost(post.id, { content, type, isVisible, ...location })
        : await contentStore.createPost({
            content,
            type,
            ...location,
            imageIds: imageBtn.value?.getImageIds() ?? [],
          })

    if (result.success && result.data) {
      if (!props.isEdit) {
        imageBtn.value?.markSaved()
        form.value = PostFormSchema.parse({ location: props.defaultLocation })
      }
      emit('saved', result.data.post)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BForm
    @submit.prevent="handleSubmit"
    class="w-100 p-2 mt-2"
  >
    <PostIt
      class="position-relative p-2"
      :id="post?.id ?? 'new-post'"
    >
      <BFormGroup class="mb-2">
        <BFormRadioGroup v-model="form.type">
          <BFormRadio
            id="post-type-offer"
            value="OFFER"
            class="me-3"
          >
            <PostTypeBadge :type="'OFFER'" />
          </BFormRadio>
          <BFormRadio
            id="post-type-request"
            value="REQUEST"
          >
            <PostTypeBadge :type="'REQUEST'" />
          </BFormRadio>
        </BFormRadioGroup>
      </BFormGroup>

      <div
        class="post-card d-flex flex-column"
        :class="[`post-card--${form.type.toLowerCase()}`]"
      >
        <BFormGroup>
          <!-- content textarea -->
          <BFormTextarea
            id="post-content"
            v-model="form.content"
            :placeholder="$t('posts.placeholders.content')"
            :maxlength="POST_CONTENT_MAX_LENGTH"
            required
            rows="6"
            :label="$t('posts.labels.content')"
          ></BFormTextarea>
          <div class="fs-6 text-end form-text text-muted character-count">
            {{ form.content.length }}/{{ POST_CONTENT_MAX_LENGTH }}
          </div>
        </BFormGroup>

        <BFormGroup class="mb-2">
          <LocationSelector
            v-model="form.location"
            open-direction="top"
            :allow-empty="true"
            :close-on-select="true"
          />
        </BFormGroup>
      </div>

      <!-- submit button -->
    </PostIt>
    <BFormGroup class="mb-2">
      <AttachImageButton
        ref="imageBtn"
        :contentId="post?.id"
      />
    </BFormGroup>
    <div class="d-flex justify-content-end mt-3">
      <BButton
        type="button"
        @click="$emit('cancel')"
        variant="link-secondary"
        class="me-2"
        :disabled="isLoading"
      >
        {{ $t('posts.actions.cancel') }}
      </BButton>
      <BButton
        type="submit"
        variant="success"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading">{{ $t('uicomponents.submitbutton.working') }}</span>
        <span v-else-if="isEdit">{{ $t('posts.actions.save') }}</span>
        <span v-else>{{ $t('posts.actions.create') }}</span>
      </BButton>
    </div>
  </BForm>
</template>

<style scoped></style>
