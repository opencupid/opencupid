import { useImageStore } from "@/features/images/stores/imageStore"
import { type EditProfileForm, EditProfileFormSchema } from "@zod/profile/profile.form"
import { computed } from "vue"

// https://github.com/vueuse/vueuse/blob/main/packages/core/useStepper/index.md
// https://playground.vueuse.org/?vueuse=13.3.0#eNrFWG1v2zYQ/isXf6htIFLarvtixGle0AIthjZYsu3DPAy0dHKYUKRAUk68LP99R4p6sx03aTv0SyKRx7vnnjvenXw/OCmKeFniYDI4NInmhQWDtixAMLmYzgbWzAZHM8nzQmkL91AavLBYFKjhATKtchge03FaPkiUxmFHVCNLLF9iI0hytD+TiZLGQqZ0DtNGanQ/kwAZ18Z+YjlOYPhRyeG+WxSsWasW5lwILhcnaarRmGaZ9FpN2k6SBAuL6QQyJgxWe0zPlfycZeSdpbPdvYKtcpSW9CQaU24jEk6HwAwMaatgYgj/9vfo2MO4dcUERqYdeip/hrSgIy6ds8xy8mgCfgPAciucS7+RBHQlPCYAbn5ngpMTozFMjzxdcUMPvHhRrdTc+EMP/u8w0BOxip9Nk6eVANQCOyz2qX4bW81z2t6bTmvWg1GLOt9i6tIv7zCwHjSYkmqry55HIUKb6s/DxnYDf/aD1oTzr5jLRJQpmpHHENSPG5NVcLNSUmoqCaac59ySTm+dZzAKEY+TUms6GS+ZKDEO5kdjOu7g1FILdak+4R1pINU9zUwIly/mFAkInmisFHCZ4t0EZJnPUY8nMFdKIJOVfU33U0vYO9GarWJ3tUb3IFAu7NWEEolOkg+BAVkKEcDERuU4Gv29D9xv7dXomB3x8dseeAJ5eFCVA7r89GIxLwSzSG8Ahylf+ofqERJKQkO1IhNkesGK6DVcl8bybBUlRA5qX0KceDiwjMhbOuBpJDypx8SJ6ADJ/TcVqbMBTG5wRdI8pefaVkclKZ2X1irCWS8ATFJu2FxgSrJ7j7E8dteotsnD9oinY9Lf0XWcCJ7ckKJuPDfFlpGlGAex2GdoV+Cg5eCgQ2B4Dm++KNY+5jZ69ZJ8Pq7yLy40LolPZ8EvdGk1BaVHfdDhiMSCLpi00VwJR1wP3WbqBrhdlBuhdX+iRIm16IaQE9rX/ai0XvZiz7MOCm7OKhyjzVJJ/PbOBzeP3rsqCNJ1BMpSt7ImxWVRWrKUqxSFQ9+rnZ0s2iPQL+OfacWuCgzMPWL1F6q0zzZal+dn2uxnxZPYWy/6W8jbirBf4L83qqorbMGynhsdgNzd2apfR6pp2D6Fe8jXW3qLPbnC5Gau7jqs53otO4NJweYoXCfabvPoAzDfmMAqSLFQhltgYZqAVhIyxMMDr2zd085lf7r3oSlucXqtXX67042pjq9XCD5y5KF/qYWe6uJXZErd4r8mV9omv0lY0NvypFnK1QZJ4MvgurIvUNcTPfNvLjXS75gJ1cTy7W7VenZ71EjRXHXOxHPD/Xj4N3tB1bLrhGiGEW5cnW1bf7eNf2Ho2nDOjVx9mJXRXUD+DxwXVbfejaTPYX9EcBFvZ4TH+7JrxG9cI37Vvfa9A7dRRiMhFHckWKyobWtV0siY0oipU+rl1b8oZ24aK1iCkRNSS9SZULcRK6kOXnkd/V7fmz86c8fRe8K+0TAPaZRpJxLnXn/0WMufH+vBH/wff6d3+hByYqsb/ef66fCgM1QP9ulLm6psxhfxtVGSPsf9rO/qc15wgfpz4WYiatDNN9BsQHOtuv3o15ovJn/GtYIt69eGusOEHs6p16NeUmY3e5bpBVI9cdvvLvzVaTep9JRuPNyx+SsaJUqHsRI7paAQ7I6cR/vB/zpAHfPSvLuzKE3tlAPafvHNBvRjwdkO11u4P8Vv/Dn6ahk8/AcWuUbe


export const useWizardSteps = (formData: EditProfileForm) => {

const imageStore = useImageStore()

  const socialSteps = {
    publicname: {
      state: computed(() => (formData.publicName ? formData.publicName.length >= 3 : null)),
      flags: '',
    },
    location: {
      state: computed(() => (formData.location.country && formData.location.cityId ? true : false)),
      flags: '',
    },
    looking_for: {
      state: computed(() =>
        [formData.isDatingActive, formData.isSocialActive].some(t => t) ? true : false
      ),
      flags: '',
    },
    interests: {
      state: computed(() => formData.tags.length > 0),
      flags: '',
    },
    languages: {
      state: computed(() => (formData.languages.length > 0 ? true : false)),
      flags: '',
    },
    introSocial: {
      state: computed(() => Object.values(formData.introSocialLocalized).some(val => val.trim() !== '')),
      flags: '',
    },
    photos: {
      state: computed(() => imageStore.images.length >= 1),
      flags: 'stage_one_end',
    },
  }

  const datingSteps = {
    // Dating steps
    age: {
      state: computed(() =>
        EditProfileFormSchema.pick({ birthday: true }).safeParse(formData.birthday) ? true : false
      ),
      flags: '',
    },
    gender: {
      state: computed(() => formData.gender && formData.gender != 'unspecified'),
      flags: '',
    },
    family_situation: {
      state: computed(() => formData.relationship && formData.hasKids),
      flags: '',
    },
    introDating: {
      state: computed(() => Object.values(formData.introDatingLocalized).some(val => val.trim() !== '')),
      flags: '',
    },
  }

  const confirmStep = {
    confirm: {
      state: computed(() => true),
      flags: '',
    },
  }


  const datingWizardSteps = {
    ...datingSteps,
    ...confirmStep,
  }

  const onboardingWizardSteps = {
    ...socialSteps,
    ...datingSteps,
    ...confirmStep
  }

  return {
    datingWizardSteps,
    onboardingWizardSteps
  }
}