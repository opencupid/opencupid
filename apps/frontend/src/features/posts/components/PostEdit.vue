<template>
  <div class="post-edit">
    <form @submit.prevent="handleSubmit" class="post-form">
      <div class="form-group">
        <label for="post-type" class="form-label">{{ $t('posts.labels.type') }}</label>
        <select 
          id="post-type"
          v-model="form.type" 
          class="form-select"
          required
        >
          <option value="OFFER">{{ $t('posts.types.OFFER') }}</option>
          <option value="REQUEST">{{ $t('posts.types.REQUEST') }}</option>
        </select>
      </div>

      <div class="form-group">
        <label for="post-content" class="form-label">{{ $t('posts.labels.content') }}</label>
        <textarea
          id="post-content"
          v-model="form.content"
          :placeholder="$t('posts.placeholders.content')"
          class="form-textarea"
          rows="4"
          maxlength="2000"
          required
        ></textarea>
        <div class="character-count">
          {{ form.content.length }}/2000
        </div>
      </div>

      <div v-if="isEdit" class="form-group">
        <label class="form-checkbox-label">
          <input 
            type="checkbox" 
            v-model="form.isVisible"
            class="form-checkbox"
          >
          {{ $t('posts.labels.visibility') }}
        </label>
      </div>

      <div class="form-actions">
        <button 
          type="button" 
          @click="$emit('cancel')"
          class="btn btn-secondary"
          :disabled="isLoading"
        >
          {{ $t('posts.actions.cancel') }}
        </button>
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="isLoading || !isFormValid"
        >
          {{ isLoading ? $t('uicomponents.submitbutton.working') : saveButtonText }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePostStore } from '../stores/postStore'
import { useI18n } from 'vue-i18n'
import type { CreatePostPayload, UpdatePostPayload, OwnerPost } from '@zod/post/post.dto'
import { PostType } from '@prisma/client'

interface Props {
  post?: OwnerPost
  isEdit?: boolean
}

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', post: OwnerPost): void
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const postStore = usePostStore()

const form = ref<{
  type: PostType
  content: string
  isVisible: boolean
}>({
  type: 'OFFER',
  content: '',
  isVisible: true
})

const isLoading = ref(false)

// Initialize form with existing post data if editing
if (props.isEdit && props.post) {
  form.value = {
    type: props.post.type,
    content: props.post.content,
    isVisible: props.post.isVisible
  }
}

const isFormValid = computed(() => {
  return form.value.content.trim().length > 0 && 
         form.value.content.length <= 2000
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
        isVisible: form.value.isVisible
      }
      
      const updatedPost = await postStore.updatePost(props.post.id, updatePayload)
      if (updatedPost) {
        emit('saved', updatedPost)
      }
    } else {
      // Create new post
      const createPayload: CreatePostPayload = {
        content: form.value.content,
        type: form.value.type
      }
      
      const newPost = await postStore.createPost(createPayload)
      if (newPost) {
        emit('saved', newPost)
        // Reset form for new post
        form.value = {
          type: 'OFFER',
          content: '',
          isVisible: true
        }
      }
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.post-edit {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #374151;
}

.form-select,
.form-textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.character-count {
  text-align: right;
  font-size: 0.875rem;
  color: #6b7280;
}

.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}
</style>