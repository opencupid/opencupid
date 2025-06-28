import { computed } from 'vue'

export function useAgeFields(birthday: Date | null) {
  const birthYearMax = computed(() => {
    return new Date().getFullYear() - 18
  })

  const birthYearMin = computed(() => {
    return 1950
  })

  const age = computed(() => {
    if (!birthday) return null
    const currentYear = new Date().getFullYear()
    return currentYear - new Date(birthday).getFullYear()
  })

  return {
    age,
    birthYearMin,
    birthYearMax,
  }
}
