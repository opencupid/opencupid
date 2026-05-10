<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import type { OwnerEvent } from '@zod/event/event.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'

import { VueDatePicker } from '@vuepic/vue-datepicker'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'

const EVENT_CONTENT_MAX_LENGTH = 300

const EventFormSchema = z.object({
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  startsAt: z.coerce.date(),
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

const contentStore = useUserContentStore()

const event = props.event

const form = ref<EventForm>(
  EventFormSchema.parse({
    content: event?.content ?? '',
    isVisible: event?.isVisible ?? true,
    startsAt: event?.startsAt ?? nextHourFromNow(),
    location: event?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)

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
    const { content, isVisible, startsAt, location } = form.value

    const result =
      props.isEdit && event
        ? await contentStore.updateEvent(event.id, { content, isVisible, startsAt, ...location })
        : await contentStore.createEvent({ content, startsAt, ...location })

    if (result.success && result.data) {
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
    class="w-100 p-2 mt-2"
  >
    <BFormGroup
      :label="$t('events.labels.starts_at')"
      label-for="event-starts-at"
      class="mb-3"
    >
      <VueDatePicker
        id="event-starts-at"
        v-model="form.startsAt"
        :min-date="new Date()"
        :enable-time-picker="true"
        :clearable="false"
        :auto-apply="false"
        :placeholder="$t('events.placeholders.starts_at')"
        format="yyyy-MM-dd HH:mm"
      />
    </BFormGroup>

    <BFormGroup
      :label="$t('events.labels.content')"
      label-for="event-content"
      class="mb-3"
    >
      <BFormTextarea
        id="event-content"
        v-model="form.content"
        :placeholder="$t('events.placeholders.content')"
        :maxlength="EVENT_CONTENT_MAX_LENGTH"
        required
        rows="6"
      />
      <div class="fs-6 text-end form-text text-muted">
        {{ form.content.length }}/{{ EVENT_CONTENT_MAX_LENGTH }}
      </div>
    </BFormGroup>

    <BFormGroup class="mb-3">
      <LocationSelector
        v-model="form.location"
        open-direction="top"
        :allow-empty="true"
        :close-on-select="true"
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
