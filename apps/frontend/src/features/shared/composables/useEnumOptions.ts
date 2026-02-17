// composables/useEnumOptions.ts
import {
  GenderSchema,
  RelationshipStatusSchema,
  HasKidsSchema,
  PronounsSchema,
} from '@zod/generated'

/**
 * Composable to provide options for various enums used in profiles.
 * It uses a translation function to generate labels for each option.
 *
 * @param t - Translation function to get localized labels.
 * @returns An object containing methods to get options for different enums.
 */
export function useEnumOptions(t: (key: string) => string) {
  function enumOptions<T extends Record<string, string | number>>(enumObj: T, prefix: string) {
    return Object.values(enumObj).map((value) => ({
      value,
      label: t(`${prefix}.${value}`),
    }))
  }

  function enumLabels<T extends Record<string, string | number>>(
    enumObj: T,
    prefix: string
  ): Record<T[keyof T], string> {
    const labels: Record<string, string> = {}
    for (const value of Object.values(enumObj)) {
      labels[value] = t(`${prefix}.${value}`)
    }
    return labels as Record<T[keyof T], string>
  }

  function getLabel<T extends Record<string, string | number>>(
    enumObj: T,
    prefix: string,
    value: T[keyof T]
  ): string {
    return t(`${prefix}.${value}`)
  }

  return {
    genderOptions: () => enumOptions(GenderSchema.enum, 'gender'),
    genderLabels: () => enumLabels(GenderSchema.enum, 'gender'),
    genderPreferenceOptions: () => enumOptions(GenderSchema.enum, 'gender_preferences'),

    relationshipStatusOptions: () => enumOptions(RelationshipStatusSchema.enum, 'relationship'),
    relationshipStatusLabels: () => enumLabels(RelationshipStatusSchema.enum, 'relationship'),

    hasKidsOptions: () => enumOptions(HasKidsSchema.enum, 'haskids'),
    hasKidsLabels: () => enumLabels(HasKidsSchema.enum, 'haskids_label'),

    hasKidsPreferenceOptions: () => enumOptions(HasKidsSchema.enum, 'haskids_preference'),

    pronounsOptions: () => enumOptions(PronounsSchema.enum, 'pronouns'),
    pronounsLabels: () => enumLabels(PronounsSchema.enum, 'pronouns'),
  }
}
