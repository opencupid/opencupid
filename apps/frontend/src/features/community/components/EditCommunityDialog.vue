<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import {
  ContactEmailSchema,
  ContactUrlSchema,
  DescriptionSchema,
  type OwnerCommunity,
} from '@zod/community/community.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'

import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
import VisibilityToggle from '@/features/shared/ui/VisibilityToggle.vue'

// `content` holds the short community name; `description` holds the long body.
const COMMUNITY_NAME_MAX_LENGTH = 300
const COMMUNITY_DESCRIPTION_MAX_LENGTH = 2000

const CommunityFormSchema = z.object({
  content: z.string().default(''),
  description: z.string().default(''),
  isVisible: z.boolean().default(true),
  yearFounded: z.number().int().nullable().default(null),
  contactUrl: z.string().default(''),
  contactEmail: z.string().default(''),
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
    description: community?.description ?? '',
    isVisible: community?.isVisible ?? true,
    yearFounded: community?.yearFounded ?? null,
    contactUrl: community?.contactUrl ?? '',
    contactEmail: community?.contactEmail ?? '',
    location: community?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)
const imageBtn = ref<InstanceType<typeof AttachImageButton> | null>(null)

const YEAR_PICKER_WINDOW = 15
const currentYear = new Date().getUTCFullYear()
const yearOptions = computed(() => [
  { value: null, text: t('community.placeholders.year_unknown') },
  ...Array.from({ length: YEAR_PICKER_WINDOW }, (_, i) => {
    const y = currentYear - i
    return { value: y, text: String(y) }
  }),
])

// Description and both contact fields are optional: an empty input clears them.
const description = computed(() => form.value.description.trim() || null)
const contactUrl = computed(() => form.value.contactUrl.trim() || null)
const contactEmail = computed(() => form.value.contactEmail.trim() || null)

// `null` keeps an untouched field neutral, mirroring PublicNameInput.
const descriptionState = computed<boolean | null>(() =>
  description.value === null ? null : DescriptionSchema.safeParse(description.value).success
)
const contactUrlState = computed<boolean | null>(() =>
  contactUrl.value === null ? null : ContactUrlSchema.safeParse(contactUrl.value).success
)
const contactEmailState = computed<boolean | null>(() =>
  contactEmail.value === null ? null : ContactEmailSchema.safeParse(contactEmail.value).success
)

const isFormValid = computed(() => {
  return (
    form.value.content.trim().length > 0 &&
    form.value.content.length <= COMMUNITY_NAME_MAX_LENGTH &&
    descriptionState.value !== false &&
    contactUrlState.value !== false &&
    contactEmailState.value !== false
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
            description: description.value,
            contactUrl: contactUrl.value,
            contactEmail: contactEmail.value,
            ...location,
          })
        : await contentStore.createCommunity({
            content,
            yearFounded,
            description: description.value,
            contactUrl: contactUrl.value,
            contactEmail: contactEmail.value,
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
    <BFormGroup class="mb-2 mb-lg-3">
      <BFormInput
        v-model="form.content"
        :placeholder="$t('community.placeholders.name')"
        :maxlength="COMMUNITY_NAME_MAX_LENGTH"
        required
      />
    </BFormGroup>

    <BFormGroup class="mb-2 mb-lg-3 position-relative">
      <BFormTextarea
        v-model="form.description"
        :placeholder="$t('community.placeholders.description')"
        :maxlength="COMMUNITY_DESCRIPTION_MAX_LENGTH"
        :state="descriptionState"
        rows="6"
      />
      <div
        class="form-hint text-muted small position-absolute bottom-0 start-50 translate-middle-x"
      >
        {{ form.description.length }}/{{ COMMUNITY_DESCRIPTION_MAX_LENGTH }}
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

    <BFormGroup
      :label="$t('community.labels.contact_url')"
      label-for="community-contact-url"
      class="mb-3"
      label-cols-sm="4"
      label-cols-lg="4"
      content-cols-sm="8"
      content-cols-lg="8"
    >
      <BFormInput
        id="community-contact-url"
        v-model="form.contactUrl"
        type="url"
        inputmode="url"
        autocomplete="url"
        :placeholder="$t('community.placeholders.contact_url')"
        :state="contactUrlState"
      />
      <BFormInvalidFeedback :state="contactUrlState">
        {{ $t('community.messages.invalid_contact_url') }}
      </BFormInvalidFeedback>
    </BFormGroup>

    <BFormGroup
      :label="$t('community.labels.contact_email')"
      label-for="community-contact-email"
      class="mb-3"
      label-cols-sm="4"
      label-cols-lg="4"
      content-cols-sm="8"
      content-cols-lg="8"
    >
      <BFormInput
        id="community-contact-email"
        v-model="form.contactEmail"
        type="email"
        inputmode="email"
        autocomplete="email"
        :placeholder="$t('community.placeholders.contact_email')"
        :state="contactEmailState"
      />
      <BFormInvalidFeedback :state="contactEmailState">
        {{ $t('community.messages.invalid_contact_email') }}
      </BFormInvalidFeedback>
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
      <AttachImageButton
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
