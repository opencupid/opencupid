<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import type { OwnerEvent } from '@zod/event/event.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'

import { VueDatePicker } from '@vuepic/vue-datepicker'
import { enGB } from 'date-fns/locale/en-GB'
import { hu as huLocale } from 'date-fns/locale/hu'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'

// XXX hardcoded locales - needs attention when adding new locale support to i18n
const datepickerLocales = { en: enGB, hu: huLocale } as const

const EVENT_CONTENT_MAX_LENGTH = 300
const EVENT_VENUE_MAX_LENGTH = 120

const EventFormSchema = z.object({
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  startsAt: z.coerce.date(),
  venue: z.string().max(EVENT_VENUE_MAX_LENGTH).default(''),
  location: LocationSchema,
})
type EventForm = z.infer<typeof EventFormSchema>

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', event: OwnerEvent): void
}

interface Props {
  event?: OwnerEvent
  isEdit: boolean
  defaultLocation: LocationDTO
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
})

const emit = defineEmits<Emits>()

const { locale } = useI18n()
const datepickerLocale = computed(
  () => datepickerLocales[locale.value as keyof typeof datepickerLocales] ?? enGB
)
const contentStore = useUserContentStore()

const event = props.event

const form = ref<EventForm>(
  EventFormSchema.parse({
    content: event?.content ?? '',
    isVisible: event?.isVisible ?? true,
    startsAt: event?.startsAt ?? nextHourFromNow(),
    venue: event?.venue ?? '',
    location: event?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)
const imageBtn = ref<InstanceType<typeof ContentImageButton> | null>(null)

const isFormValid = computed(() => {
  return (
    form.value.content.trim().length > 10 &&
    form.value.content.length <= EVENT_CONTENT_MAX_LENGTH &&
    form.value.startsAt instanceof Date &&
    !isNaN(form.value.startsAt.getTime())
  )
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true

  try {
    const { content, isVisible, startsAt, venue, location } = form.value
    const venueOrNull = venue.trim() === '' ? null : venue.trim()

    const result =
      props.isEdit && event
        ? await contentStore.updateEvent(event.id, {
            content,
            isVisible,
            startsAt,
            venue: venueOrNull,
            ...location,
          })
        : await contentStore.createEvent({
            content,
            startsAt,
            venue: venueOrNull,
            ...location,
            imageIds: imageBtn.value?.getImageIds() ?? [],
          })

    if (result.success && result.data) {
      if (!props.isEdit) {
        imageBtn.value?.markSaved()
      }
      emit('saved', result.data.event)
    }
  } finally {
    isLoading.value = false
  }
}

function nextHourFromNow(): Date {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d
}
</script>

<template>
  <BForm
    @submit.prevent="handleSubmit"
    class="w-100 p-2 p-md-4 p-lg-5 mt-2 scrollable hide-scrollbar"
  >
    <BFormGroup
      :label="$t('events.labels.content')"
      label-for="event-content"
      class="mb-2 mb-lg-3 position-relative"
    >
      <BFormTextarea
        id="event-content"
        v-model="form.content"
        :placeholder="$t('events.placeholders.content')"
        :maxlength="EVENT_CONTENT_MAX_LENGTH"
        required
        rows="6"
      />
      <div class="form-hint text-muted small position-absolute bottom-0 start-50 translate-middle-x">
        {{ form.content.length }}/{{ EVENT_CONTENT_MAX_LENGTH }}
      </div>
    </BFormGroup>

    <BFormGroup
      :label="$t('events.labels.starts_at')"
      label-for="event-starts-at"
      class="mb-3"
    >
      <VueDatePicker
        id="event-starts-at"
        v-model="form.startsAt"
        :locale="datepickerLocale"
        :min-date="new Date()"
        :enable-time-picker="true"
        :clearable="false"
        :auto-apply="false"
        :placeholder="$t('events.placeholders.starts_at')"
        :ui="{ navBtnPrev: 'btn btn-outline-primary', navBtnNext: 'btn btn-outline-primary' }"
        format="yyyy-MM-dd HH:mm"
      />
    </BFormGroup>

    <BFormGroup
      class="mb-3"
      :label="$t('events.labels.venue')"
    >
      <LocationSelector
        v-model="form.location"
        open-direction="top"
        :allow-empty="true"
        :close-on-select="true"
      />
    </BFormGroup>

    <BFormGroup
      label-for="event-venue"
      class="mb-3"
    >
      <BFormInput
        id="event-venue"
        v-model="form.venue"
        :placeholder="$t('events.placeholders.venue')"
        :maxlength="EVENT_VENUE_MAX_LENGTH"
      />
    </BFormGroup>

    <BFormGroup
      v-if="isEdit"
      class="d-flex align-items-center mb-3"
    >
      <BFormCheckbox v-model="form.isVisible">
        {{ $t('events.labels.visibility') }}
      </BFormCheckbox>
    </BFormGroup>

    <BFormGroup class="mb-3">
      <ContentImageButton
        ref="imageBtn"
        :contentId="event?.id"
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
        {{ $t('events.actions.cancel') }}
      </BButton>
      <BButton
        type="submit"
        variant="success"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading">{{ $t('uicomponents.submitbutton.working') }}</span>
        <span v-else-if="isEdit">{{ $t('events.actions.save') }}</span>
        <span v-else>{{ $t('events.actions.create') }}</span>
      </BButton>
    </div>
  </BForm>
</template>

<style scoped></style>
