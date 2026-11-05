<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiRequest } from '../composables/useApi'

export interface AdminProfileImage {
  id: string
  hasFace: boolean
  position: number
  variants: { size: string; url: string }[]
}

const props = defineProps<{
  profileId: string
  images: AdminProfileImage[]
  hasFace: boolean
}>()

const emit = defineEmits<{ 'update:hasFace': [value: boolean] }>()

const saving = ref(false)
const saveError = ref<string | null>(null)

watch(
  () => props.profileId,
  () => (saveError.value = null)
)

function variantUrl(image: AdminProfileImage, size: string) {
  return image.variants.find((v) => v.size === size)?.url
}

async function toggleHasFace(event: Event) {
  const input = event.target as HTMLInputElement
  const hasFace = input.checked
  saving.value = true
  saveError.value = null
  try {
    await apiRequest(`/admin/profiles/${props.profileId}`, { method: 'PATCH', body: { hasFace } })
    emit('update:hasFace', hasFace)
  } catch (err) {
    // Keep the checkbox in sync with the stored value.
    input.checked = props.hasFace
    saveError.value = err instanceof Error ? err.message : 'Failed to update hasFace'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div data-testid="profile-image-review">
    <div
      v-if="images.length === 0"
      class="text-muted small"
    >
      No photos.
    </div>
    <div
      v-else
      class="image-review-grid"
    >
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="image-review-item"
        data-testid="profile-image"
      >
        <img
          :src="variantUrl(image, 'thumb')"
          :class="[
            'image-review-thumb',
            index === 0 ? 'is-primary' : '',
            image.hasFace ? 'has-face' : 'no-face',
          ]"
          :title="image.hasFace ? 'Face detected' : 'No face detected'"
          alt=""
        />
        <img
          :src="variantUrl(image, 'card')"
          class="image-review-preview"
          loading="lazy"
          alt=""
        />
      </div>
    </div>

    <div class="form-check mt-2">
      <input
        id="profile-has-face"
        class="form-check-input"
        type="checkbox"
        :checked="hasFace"
        :disabled="saving"
        data-testid="profile-has-face"
        @change="toggleHasFace"
      />
      <label
        class="form-check-label small"
        for="profile-has-face"
      >
        Profile has face
      </label>
    </div>
    <div
      v-if="saveError"
      class="text-danger small"
    >
      {{ saveError }}
    </div>
  </div>
</template>

<style scoped>
/* Two rows of 40px thumbnails beside a primary photo spanning both rows */
.image-review-grid {
  display: grid;
  grid-template-rows: repeat(2, 40px);
  grid-auto-columns: 40px;
  grid-auto-flow: column;
  gap: 8px;
}

.image-review-item {
  position: relative;
}

.image-review-item:first-child {
  grid-row: span 2;
  grid-column: span 2;
}

.image-review-thumb {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.image-review-thumb.is-primary {
  width: 88px;
  height: 88px;
}

/* hasFace halo */
.image-review-thumb.has-face {
  box-shadow: 0 0 0 3px var(--bs-success);
}

.image-review-thumb.no-face {
  box-shadow: 0 0 0 3px var(--bs-danger);
}

.image-review-preview {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  width: 240px;
  height: 240px;
  object-fit: cover;
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.image-review-item:hover .image-review-preview {
  display: block;
}
</style>
