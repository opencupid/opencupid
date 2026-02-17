import { type ProfileScope } from '@zod/profile/profile.dto'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

export type ViewState = {
  isEditable: boolean
  previewLanguage: string
  currentScope: ProfileScope
  scopes: ProfileScope[]
}

export type FieldEditState = {
  currentField: keyof EditFieldProfileFormWithImages | null // Field being edited
  fieldEditModal: boolean // Modal state for editing profile fields
}
