<script setup lang="ts">
import { computed, provide, reactive, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import { type FieldEditState } from '../composables/types'

const { t } = useI18n()

const model = defineModel<EditFieldProfileFormWithImages>()
const formData: EditFieldProfileFormWithImages = reactive({} as EditFieldProfileFormWithImages)

const props = defineProps<{
  editState?: boolean
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const fieldEditState: FieldEditState = reactive({
  currentField: null, // Field being edited
  fieldEditModal: false,
})

const modalTitle = computed(() => {
  const field = fieldEditState.currentField
  if (!field) return ''
  return t(`profiles.forms.edit_titles.${field}`)
})

const handleCancelEdit = () => {
  fieldEditState.currentField = null
  Object.assign(formData, model.value)
}

const handleUpdate = () => {
  if (model.value) {
    Object.assign(model.value, formData)
  }
  emit('updated')
  fieldEditState.currentField = null
}

watch(
  () => model.value,
  () => {
    Object.assign(formData, model.value)
  },
  { immediate: true, deep: true }
)

provide('fieldEditState', fieldEditState)
provide('editableModel', formData)
provide('isEditable', toRef(props, 'editState'))
</script>

<template>
  <BModal
    v-model="fieldEditState.fieldEditModal"
    :title="modalTitle"
    :backdrop="'static'"
    centered
    size="lg"
    button-size="sm"
    fullscreen="sm"
    :focus="false"
    :no-close-on-backdrop="true"
    :no-header="false"
    :ok-title="'OK'"
    :ok-class="'btn btn-primary px-5'"
    :initial-animation="false"
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden flex-grow-1 min-h-0"
    modal-class="field-edit-modal"
    @ok="handleUpdate"
    @cancel="handleCancelEdit"
    @close="handleCancelEdit"
    :keyboard="false"
  >
    <template #cancel="{ close }">
      <BButton
        class="btn btn-link text-decoration-none"
        @click="close"
        variant="link"
        size="sm"
        >{{ $t('uicomponents.dialog_cancel_button') }}</BButton
      >
    </template>
    <div
      id="field-edit-modal"
      class="w-100 py-2"
    ></div>
  </BModal>
  <slot> </slot>
</template>

<style lang="scss">
.field-edit-modal .modal-dialog {
  max-height: calc(100dvh - 2rem);
  display: flex;
  flex-direction: column;
}

.field-edit-modal .modal-content {
  max-height: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.field-edit-modal .modal-body {
  min-height: 0;
}
</style>
