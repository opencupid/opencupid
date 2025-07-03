import { type OwnerProfile, type PublicProfile, type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { computed, h, type Ref } from 'vue'
import { useEnumOptions } from './useEnumOptions'

export function useDatingFields(profile: Ref<PublicProfile | OwnerProfile>, t: (key: string) => string) {
  const birthYearMax = computed(() => {
    return new Date().getFullYear() - 18
  })

  const birthYearMin = computed(() => {
    return 1950
  })

  const gender = computed(() => {
    if (!profile.value.isDatingActive) {
      return ''
    }
    return profile.value.gender
  })

  const age = computed(() => {
    if (!profile.value.isDatingActive || !profile.value.birthday) return null
    const currentYear = new Date().getFullYear()
    return currentYear - new Date(profile.value.birthday).getFullYear()
  })

  const { relationshipStatusLabels, pronounsLabels, hasKidsLabels } = useEnumOptions(t)

  const hasKids = computed(() => {
    if (!profile.value.isDatingActive || profile.value.hasKids === 'unspecified') return ''
    return hasKidsLabels()[profile.value.hasKids!] || profile.value.hasKids
  })

  const relationshipStatus = computed(() => {
    if (!profile.value.isDatingActive) return ''
    if (!profile.value.relationship || profile.value.relationship === 'unspecified') return ''

    return relationshipStatusLabels()[profile.value.relationship] || profile.value.relationship
  })

  const pronouns = computed(() => {
    if (!profile.value.isDatingActive) return ''
    if (!profile.value.pronouns || profile.value.pronouns === 'unspecified') return ''

    return pronounsLabels()[profile.value.pronouns] || profile.value.pronouns
  })


  return {
    age,
    gender,
    hasKids,
    relationshipStatus,
    pronouns,
    birthYearMin,
    birthYearMax,
  }
}
