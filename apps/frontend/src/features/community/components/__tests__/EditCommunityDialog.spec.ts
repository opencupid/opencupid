import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'en' } }),
}))

vi.mock('@/features/shared/profileform/LocationSelector.vue', () => ({
  default: { template: '<div class="loc-selector" />' },
}))

vi.mock('@/assets/icons/interface/hide.svg', () => ({
  default: { template: '<span class="icon-hide" />' },
}))
vi.mock('@/assets/icons/interface/unhide.svg', () => ({
  default: { template: '<span class="icon-show" />' },
}))

const createCommunityMock = vi.fn().mockResolvedValue({
  success: true,
  data: { community: { id: 'c-new', kind: 'community', content: 'X', yearFounded: 2020 } },
})
const updateCommunityMock = vi.fn().mockResolvedValue({
  success: true,
  data: { community: { id: 'c-existing', kind: 'community', content: 'X', yearFounded: 2010 } },
})

vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({
    createCommunity: createCommunityMock,
    updateCommunity: updateCommunityMock,
  }),
}))

vi.mock('@/features/images/components/AttachImageButton.vue', () => ({
  default: {
    template: '<div class="attach-image-button" />',
    setup: () => ({ getImageIds: () => [], markSaved: () => {} }),
    expose: ['getImageIds', 'markSaved'],
  },
}))

import EditCommunityDialog from '../EditCommunityDialog.vue'

const stubs = {
  BForm: {
    emits: ['submit'],
    template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  },
  BFormGroup: { template: '<div><slot /></div>' },
  BFormTextarea: {
    props: ['modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BFormInput: {
    props: ['modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BFormSelect: {
    props: ['modelValue', 'options'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value === \'null\' ? null : Number($event.target.value))"><option v-for="o in options" :key="o.value ?? \'null\'" :value="o.value ?? \'null\'">{{ o.text }}</option></select>',
  },
  BFormCheckbox: {
    props: ['modelValue'],
    template:
      '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  BButton: {
    props: ['type', 'disabled'],
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}

const defaultLocation = { country: 'HU', cityName: 'Budapest', lat: null, lon: null }

const globalOptions = {
  stubs,
  mocks: { $t: (k: string) => k },
}

describe('EditCommunityDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createCommunityMock.mockClear()
    updateCommunityMock.mockClear()
  })

  it('disables submit when content shorter than 11 chars', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: globalOptions,
    })
    await wrapper.find('textarea').setValue('short')
    const submitBtn = wrapper
      .findAll('button')
      .filter((b) => b.attributes('type') === 'submit')
      .at(-1)!
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('calls createCommunity in create-mode with null yearFounded by default', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: globalOptions,
    })
    await wrapper.find('textarea').setValue('This is a long-enough description.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createCommunityMock).toHaveBeenCalledTimes(1)
    expect(createCommunityMock.mock.calls[0]![0]).toMatchObject({
      content: 'This is a long-enough description.',
      yearFounded: null,
    })
  })

  it('pre-populates content from props.community in edit mode', () => {
    const community = {
      id: 'c-existing',
      kind: 'community',
      content: 'Existing community description longer than 10',
      yearFounded: 2015,
      isVisible: false,
      location: defaultLocation,
      postedBy: { id: 'p', publicName: 'Alice' },
    }
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: true, community: community as any, defaultLocation },
      global: globalOptions,
    })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'Existing community description longer than 10'
    )
  })
})
