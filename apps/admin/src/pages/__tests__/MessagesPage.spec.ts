import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const useApiCall = vi.fn()
const apiRequestMock = vi.fn()
vi.mock('../../composables/useApi', () => ({
  useApi: () => ({
    call: useApiCall,
    loading: ref(false),
    error: ref<string | null>(null),
  }),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}))

import MessagesPage from '../MessagesPage.vue'

const sampleTemplate = {
  id: 't1',
  type: 'welcome',
  locale: 'en',
  content: 'Welcome to {siteName}!',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useApiCall.mockResolvedValue({ success: true, templates: [sampleTemplate] })
  })

  it('lists templates fetched from /admin/message-templates', async () => {
    const wrapper = mount(MessagesPage)
    await flushPromises()

    expect(useApiCall).toHaveBeenCalledWith('/admin/message-templates')
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('welcome')
    expect(rows[0].text()).toContain('en')
  })

  it('opens edit modal with the row content prefilled', async () => {
    const wrapper = mount(MessagesPage)
    await flushPromises()

    await wrapper.find('tbody tr').trigger('click')

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe(sampleTemplate.content)
  })

  it('saves edited content via PATCH and updates the row', async () => {
    const updated = { ...sampleTemplate, content: 'New text', updatedAt: '2026-02-01T00:00:00Z' }
    apiRequestMock.mockResolvedValue({ success: true, template: updated })

    const wrapper = mount(MessagesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')

    const textarea = wrapper.find('textarea')
    await textarea.setValue('New text')

    await wrapper.find('.modal-footer .btn-primary').trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/message-templates/t1', {
      method: 'PATCH',
      body: { content: 'New text' },
    })
    // Modal closed
    expect(wrapper.find('textarea').exists()).toBe(false)
    // Row reflects new preview
    expect(wrapper.find('tbody tr').text()).toContain('New text')
  })

  it('blocks save and shows error when content is blank', async () => {
    const wrapper = mount(MessagesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')

    await wrapper.find('textarea').setValue('   ')
    await wrapper.find('.modal-footer .btn-primary').trigger('click')
    await flushPromises()

    expect(apiRequestMock).not.toHaveBeenCalled()
    expect(wrapper.find('.alert-danger').text()).toContain('Content cannot be empty')
  })
})
