<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePostStore } from '../stores/postStore'
import { useI18n } from 'vue-i18n'
import type { CreatePostPayload, UpdatePostPayload, OwnerPost } from '@zod/post/post.dto'
import { type PostTypeType } from '@zod/generated'

import PostIt from '@/features/shared/ui/PostIt.vue'
import PostTypeBadge from './PostTypeBadge.vue'

interface Props {
  post?: OwnerPost
  isEdit?: boolean
}

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', post: OwnerPost): void
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const postStore = usePostStore()

const form = ref<{
  type: PostTypeType
  content: string
  isVisible: boolean
}>({
  type: 'OFFER',
  content: '',
  isVisible: true,
})

const isLoading = ref(false)

// Initialize form with existing post data if editing
if (props.isEdit && props.post) {
  form.value = {
    type: props.post.type,
    content: props.post.content,
    isVisible: props.post.isVisible,
  }
}

const isFormValid = computed(() => {
  return form.value.content.trim().length > 0 && form.value.content.length <= 2000
})

const saveButtonText = computed(() => {
  return props.isEdit ? t('posts.actions.save') : t('posts.actions.create')
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true

  try {
    if (props.isEdit && props.post) {
      // Update existing post
      const updatePayload: UpdatePostPayload = {
        content: form.value.content,
        type: form.value.type,
        isVisible: form.value.isVisible,
      }

      const updatedPost = await postStore.updatePost(props.post.id, updatePayload)
      if (updatedPost) {
        emit('saved', updatedPost)
      }
    } else {
      // Create new post
      const createPayload: CreatePostPayload = {
        content: form.value.content,
        type: form.value.type,
      }

      const newPost = await postStore.createPost(createPayload)
      if (newPost) {
        emit('saved', newPost)
        // Reset form for new post
        form.value = {
          type: 'OFFER',
          content: '',
          isVisible: true,
        }
      }
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BForm @submit.prevent="handleSubmit" class="w-100">
    <PostIt class="position-relative p-2">
      <BFormGroup class="mb-2">
        <label for="post-type" class="form-label">{{ $t('posts.labels.type') }}</label>
        <BFormRadioGroup v-model="form.type">
          <BFormRadio id="post-type-offer" value="OFFER" class="me-3">
            <PostTypeBadge :type="'OFFER'" />
          </BFormRadio>
          <BFormRadio id="post-type-request" value="REQUEST">
            <PostTypeBadge :type="'REQUEST'" />
          </BFormRadio>
        </BFormRadioGroup>
      </BFormGroup>

      <div class="post-card d-flex flex-column" :class="[`post-card--${form.type.toLowerCase()}`]">
        <BFormGroup>
          <!-- <div class="form-text">{{ $t('posts.labels.content') }}</div> -->

          <!-- content textarea -->
          <BFormTextarea
            id="post-content"
            v-model="form.content"
            :placeholder="$t('posts.placeholders.content')"
            maxlength="2000"
            required
            rows="4"
            :label="$t('posts.labels.content')"
          ></BFormTextarea>
          <div class="fs-6 text-end form-text text-muted character-count">{{ form.content.length }}/2000</div>
        </BFormGroup>

        <!-- isVisible flag checkbox -->
        <BFormGroup v-if="isEdit">
          <BFormCheckbox
            type="checkbox"
            v-model="form.isVisible"
            :label="$t('posts.labels.visibility')"
          >
          {{ $t('posts.labels.visibility') }}
          </BFormCheckbox>  
        </BFormGroup>
      </div>

      <!-- submit button -->
    </PostIt>
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
      <BButton type="submit" variant="primary" :disabled="isLoading || !isFormValid">
        {{ isLoading ? $t('uicomponents.submitbutton.working') : saveButtonText }}
      </BButton>
    </div>
  </BForm>
</template>

<style scoped></style>
