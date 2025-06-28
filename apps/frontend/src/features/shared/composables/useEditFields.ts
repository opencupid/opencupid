import { computed, provide, reactive } from "vue"
import { type FieldEditState } from "@/features/myprofile/composables/types"
import { type EditProfileForm, type EditFieldProfileFormWithImages } from "@zod/profile/profile.form"

function modelProxy<T extends object, K extends keyof T>(target: T, key: K) {
  return computed({
    get: () => target[key],
    set: val => {
      target[key] = val
    },
  })
}


export default function useEditFields(model: EditFieldProfileFormWithImages | EditProfileForm) {

  function getModelProxy<K extends keyof typeof model>(key: K) {
    return modelProxy(model, key)
  }

  
  const publicNameModel = modelProxy(model, 'publicName')
  const birthdayModel = modelProxy(model, 'birthday')
  const relationshipModel = modelProxy(model, 'relationship')
  const hasKidsModel = modelProxy(model, 'hasKids')
  const introSocialModel = modelProxy(model, 'introSocialLocalized')
  const introDatingModel = modelProxy(model, 'introDatingLocalized')
  const locationModel = modelProxy(model, 'location')
  const genderPronounsModel = computed({
    get: () => {
      return { gender: model.gender, pronouns: model.pronouns }
    },
    set: val => {
      model.gender = val.gender
      model.pronouns = val.pronouns
    },
  })


  return {
    getModelProxy,
    publicNameModel,
    birthdayModel,
    relationshipModel,
    hasKidsModel,
    introSocialModel,
    introDatingModel,
    locationModel,
    genderPronounsModel,
  }
}
