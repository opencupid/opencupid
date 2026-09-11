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
  BFormInvalidFeedback: {
    props: ['state'],
    template: '<div class="invalid-feedback" :data-state="String(state)"><slot /></div>',
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

  // The name is the first input; the description is the (only) textarea.
  const nameInput = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('input')[0]!

  it('disables submit when the name is empty', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: globalOptions,
    })
    await wrapper.find('textarea').setValue('This is a long-enough description.')
    const submitBtn = wrapper
      .findAll('button')
      .filter((b) => b.attributes('type') === 'submit')
      .at(-1)!
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('calls createCommunity with the name as content and null yearFounded by default', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: globalOptions,
    })
    await nameInput(wrapper).setValue('Test Guild')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createCommunityMock).toHaveBeenCalledTimes(1)
    expect(createCommunityMock.mock.calls[0]![0]).toMatchObject({
      content: 'Test Guild',
      yearFounded: null,
    })
  })

  it('pre-populates the name and description from props.community in edit mode', () => {
    const community = {
      id: 'c-existing',
      kind: 'community',
      content: 'Test Guild',
      description: 'A long description of the guild.',
      yearFounded: 2015,
      isVisible: false,
      location: defaultLocation,
      postedBy: { id: 'p', publicName: 'Alice' },
    }
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: true, community: community as any, defaultLocation },
      global: globalOptions,
    })
    expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('Test Guild')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'A long description of the guild.'
    )
  })
})

describe('EditCommunityDialog contact fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createCommunityMock.mockClear()
    updateCommunityMock.mockClear()
  })

  const mountCreate = () =>
    mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: globalOptions,
    })

  // Inputs are ordered: [name, contactUrl, contactEmail]. The description is
  // the sole textarea. A non-empty name is required for the form to be valid.
  const fields = (wrapper: ReturnType<typeof mountCreate>) => {
    const inputs = wrapper.findAll('input')
    return { name: inputs[0]!, url: inputs[1]!, email: inputs[2]! }
  }

  const submitBtn = (wrapper: ReturnType<typeof mountCreate>) =>
    wrapper
      .findAll('button')
      .filter((b) => b.attributes('type') === 'submit')
      .at(-1)!

  it('submits null for description and both contact fields when left empty', async () => {
    const wrapper = mountCreate()
    await fields(wrapper).name.setValue('Test Guild')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createCommunityMock.mock.calls[0]![0]).toMatchObject({
      description: null,
      contactUrl: null,
      contactEmail: null,
    })
  })

  it('submits trimmed description and contact values', async () => {
    const wrapper = mountCreate()
    const { name, url, email } = fields(wrapper)
    await name.setValue('Test Guild')
    await wrapper.find('textarea').setValue('  A long description.  ')
    await url.setValue('  https://example.org/guild  ')
    await email.setValue('  hello@example.org  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createCommunityMock.mock.calls[0]![0]).toMatchObject({
      description: 'A long description.',
      contactUrl: 'https://example.org/guild',
      contactEmail: 'hello@example.org',
    })
  })

  it('blocks submit on an invalid contactUrl', async () => {
    const wrapper = mountCreate()
    const { name, url } = fields(wrapper)
    await name.setValue('Test Guild')
    await url.setValue('javascript:alert(1)')
    expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  it('blocks submit on an invalid contactEmail', async () => {
    const wrapper = mountCreate()
    const { name, email } = fields(wrapper)
    await name.setValue('Test Guild')
    await email.setValue('not-an-email')
    expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  it('pre-populates contact fields in edit mode and clears them when emptied', async () => {
    const community = {
      id: 'c-existing',
      kind: 'community',
      content: 'Test Guild',
      description: 'A long description.',
      yearFounded: 2015,
      contactUrl: 'https://example.org/guild',
      contactEmail: 'hello@example.org',
      isVisible: true,
      location: defaultLocation,
      postedBy: { id: 'p', publicName: 'Alice' },
    }
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: true, community: community as any, defaultLocation },
      global: globalOptions,
    })
    const { url, email } = fields(wrapper)
    expect((url.element as HTMLInputElement).value).toBe('https://example.org/guild')
    expect((email.element as HTMLInputElement).value).toBe('hello@example.org')

    await url.setValue('')
    await email.setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(updateCommunityMock.mock.calls[0]![1]).toMatchObject({
      contactUrl: null,
      contactEmail: null,
    })
  })

  it('submits null description when the description textarea is cleared', async () => {
    const community = {
      id: 'c-existing',
      kind: 'community',
      content: 'Test Guild',
      description: 'A long description.',
      yearFounded: 2015,
      isVisible: true,
      location: defaultLocation,
      postedBy: { id: 'p', publicName: 'Alice' },
    }
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: true, community: community as any, defaultLocation },
      global: globalOptions,
    })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'A long description.'
    )
    await wrapper.find('textarea').setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(updateCommunityMock.mock.calls[0]![1]).toMatchObject({ description: null })
  })
})
