<script setup lang="ts">
import { type Component, inject, ref } from 'vue'
import IconPencil2 from '@/assets/icons/interface/pencil-2.svg'
import useEditFields from '@/features/shared/composables/useEditFields'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import { type FieldEditState } from '../composables/types'

// Only allow field names that are accepted by getModelProxy
type AllowedFieldKey = keyof EditFieldProfileFormWithImages

const props = defineProps<{
  fieldName: AllowedFieldKey
  editComponent: Component
  buttonClass?: string // optional class for the button
  wrapperClass?: string // optional class for the wrapper
  editProps?: Record<string, any> // allow additional props to be passed to the edit component
}>()

const isEditable = inject<boolean>('isEditable', false)
const editableModel = inject<EditFieldProfileFormWithImages>(
  'editableModel',
  {} as EditFieldProfileFormWithImages
)
const fieldEditState = inject<FieldEditState>('fieldEditState', {
  currentField: null,
  fieldEditModal: false,
})

const handleButtonClick = () => {
  fieldEditState.currentField = props.fieldName
  fieldEditState.fieldEditModal = true
}

const { getModelProxy } = useEditFields(editableModel)
// @ts-expect-error // TypeScript doesn't know about the dynamic nature of field names
const fieldProxy = getModelProxy(props.fieldName)
</script>

<template>
  <span
    v-if="isEditable"
    class="editable-field"
    v-bind:class="props.wrapperClass"
  >
    <span
      @click="handleButtonClick"
      class="clickable"
    >
      <slot name="placeholder"> </slot>
    </span>
    <a
      href="#"
      role="button"
      :title="$t('uicomponents.edit_button_title')"
      :aria-label="$t('uicomponents.edit_button_title')"
      @click="handleButtonClick"
      v-bind:class="props.buttonClass"
      class="edit-button me-2"
    >
      <slot>
        <button class="btn btn-inline-edit">
          <IconPencil2 class="svg-icon" />
        </button>
      </slot>
    </a>
    <Teleport
      to="#field-edit-modal"
      v-if="fieldEditState.fieldEditModal"
    >
      <component
        :is="editComponent"
        v-bind="editProps"
        v-model="fieldProxy"
        v-if="fieldEditState.currentField === fieldName"
      />
    </Teleport>
  </span>
  <span v-else>
    <slot name="display"></slot>
  </span>
</template>

