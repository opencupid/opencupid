<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import type { OwnerCommunity } from '@zod/community/community.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'

import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'

const COMMUNITY_CONTENT_MAX_LENGTH = 300

const CommunityFormSchema = z.object({
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  yearFounded: z.number().int().nullable().default(null),
  location: LocationSchema,
})
type CommunityForm = z.infer<typeof CommunityFormSchema>

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', community: OwnerCommunity): void
}

interface Props {
  community?: OwnerCommunity
  isEdit: boolean
  defaultLocation: LocationDTO
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const contentStore = useUserContentStore()

const community = props.community

const form = ref<CommunityForm>(
  CommunityFormSchema.parse({
    content: community?.content ?? '',
    isVisible: community?.isVisible ?? true,
    yearFounded: community?.yearFounded ?? null,
    location: community?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)
const imageBtn = ref<InstanceType<typeof ContentImageButton> | null>(null)

const YEAR_PICKER_WINDOW = 15
const currentYear = new Date().getUTCFullYear()
const yearOptions = computed(() => [
  { value: null, text: t('community.placeholders.year_unknown') },
  ...Array.from({ length: YEAR_PICKER_WINDOW }, (_, i) => {
    const y = currentYear - i
    return { value: y, text: String(y) }
  }),
])

const isFormValid = computed(() => {
  return (
    form.value.content.trim().length > 10 &&
    form.value.content.length <= COMMUNITY_CONTENT_MAX_LENGTH
  )
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true

  try {
    const { content, isVisible, yearFounded, location } = form.value
    const result =
      props.isEdit && community
        ? await contentStore.updateCommunity(community.id, {
            content,
            isVisible,
            yearFounded,
            ...location,
          })
        : await contentStore.createCommunity({
            content,
            yearFounded,
            ...location,
            imageIds: imageBtn.value?.getImageIds() ?? [],
          })

    if (result.success && result.data) {
      if (!props.isEdit) {
        imageBtn.value?.markSaved()
      }
      emit('saved', result.data.community)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BForm
    @submit.prevent="handleSubmit"
    class="w-100 p-2 p-md-4 p-lg-5 mt-2 scrollable hide-scrollbar"
  >
    <BFormGroup class="mb-2 mb-lg-3 position-relative">
      <BFormTextarea
        v-model="form.content"
        :placeholder="$t('community.placeholders.content')"
        :maxlength="COMMUNITY_CONTENT_MAX_LENGTH"
        required
        rows="6"
      />
      <div
        class="form-hint text-muted small position-absolute bottom-0 start-50 translate-middle-x"
      >
        {{ form.content.length }}/{{ COMMUNITY_CONTENT_MAX_LENGTH }}
      </div>
    </BFormGroup>

    <BFormGroup
      :label="$t('community.labels.year_founded')"
      label-for="community-year-founded"
      class="mb-3"
      label-cols-sm="4"
      label-cols-lg="4"
      content-cols-sm="8"
      content-cols-lg="8"
    >
      <BFormSelect
        id="community-year-founded"
        v-model="form.yearFounded"
        :options="yearOptions"
      />
    </BFormGroup>

    <BFormGroup class="mb-3">
      <LocationSelector
        v-model="form.location"
        open-direction="top"
        :allow-empty="true"
        :close-on-select="true"
      />
    </BFormGroup>

    <BFormGroup class="mb-3">
      <ContentImageButton
        ref="imageBtn"
        :contentId="community?.id"
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
        {{ $t('community.actions.cancel') }}
      </BButton>
      <BButton
        type="submit"
        variant="success"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading">{{ $t('uicomponents.submitbutton.working') }}</span>
        <span v-else-if="isEdit">{{ $t('community.actions.save') }}</span>
        <span v-else>{{ $t('community.actions.create') }}</span>
      </BButton>
    </div>
  </BForm>
</template>

<style scoped></style>
