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

import TagsPage from '../TagsPage.vue'

function makeTag(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    slug: 'hiking',
    name: 'Hiking',
    isUserCreated: false,
    isApproved: true,
    isHidden: false,
    createdAt: '2026-01-01T00:00:00Z',
    translations: [{ locale: 'en', name: 'Hiking' }],
    _count: { profiles: 3 },
    creator: null,
    ...overrides,
  }
}

const submitters = [
  { id: 'u1', profile: { id: 'p1', publicName: 'Alice' }, _count: { createdTags: 3 } },
  { id: 'u2', profile: { id: 'p2', publicName: '' }, _count: { createdTags: 1 } },
]

function setup(tags: ReturnType<typeof makeTag>[]) {
  useApiCall.mockResolvedValue({ success: true, tags, total: tags.length, page: 1, pageSize: 25 })
  apiRequestMock.mockImplementation((path: string) =>
    path === '/admin/tags/submitters'
      ? Promise.resolve({ success: true, submitters })
      : Promise.reject(new Error(`unexpected ${path}`))
  )
}

async function openTag(wrapper: ReturnType<typeof mount>, index = 0) {
  await wrapper.findAll('tbody tr')[index]!.trigger('click')
}

describe('TagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the edited row in place without refetching the list', async () => {
    setup([makeTag(), makeTag({ id: 't2', name: 'Cooking', slug: 'cooking' })])
    const wrapper = mount(TagsPage)
    await flushPromises()
    expect(useApiCall).toHaveBeenCalledTimes(1)

    await openTag(wrapper)
    await wrapper.get('#editName').setValue('Hiking trips')
    apiRequestMock.mockResolvedValueOnce({
      success: true,
      tag: makeTag({ name: 'Hiking trips' }),
    })
    await wrapper.findAll('.modal-footer button').at(-1)!.trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/tags/t1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(useApiCall).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.modal').exists()).toBe(false)
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('Hiking trips')
    expect(rows[1]!.text()).toContain('Cooking')
  })

  it('removes a deleted tag from the list without refetching', async () => {
    setup([makeTag(), makeTag({ id: 't2', name: 'Cooking', slug: 'cooking' })])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(TagsPage)
    await flushPromises()

    await openTag(wrapper)
    apiRequestMock.mockResolvedValueOnce({ success: true, tag: makeTag({ isDeleted: true }) })
    await wrapper.get('.modal-footer .btn-outline-danger').trigger('click')
    await flushPromises()

    expect(useApiCall).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 result')
  })

  it('shows who submitted a user-created tag with a link to their profile', async () => {
    setup([makeTag({ isUserCreated: true, creator: { profile: submitters[0]!.profile } })])
    const wrapper = mount(TagsPage)
    await flushPromises()

    await openTag(wrapper)
    const submittedBy = wrapper.get('[data-testid="tag-submitted-by"]')
    expect(submittedBy.text()).toContain('Alice')
    expect(submittedBy.get('[data-testid="view-public-profile"]').attributes('href')).toBe(
      'https://app.example.org/profile/p1'
    )
  })

  it('does not show a submitted-by line for admin-created tags', async () => {
    setup([makeTag()])
    const wrapper = mount(TagsPage)
    await flushPromises()

    await openTag(wrapper)
    expect(wrapper.find('[data-testid="tag-submitted-by"]').exists()).toBe(false)
  })

  it('filters the list by submitter', async () => {
    setup([makeTag()])
    const wrapper = mount(TagsPage)
    await flushPromises()

    const select = wrapper.get('[data-testid="submitter-filter"]')
    expect(select.findAll('option').map((o) => o.text())).toEqual([
      'All Submitters',
      'Alice (3)',
      '(no name) (1)',
    ])

    await select.setValue('u1')
    await flushPromises()

    expect(useApiCall).toHaveBeenLastCalledWith(
      '/admin/tags',
      expect.objectContaining({ params: expect.objectContaining({ submittedBy: 'u1' }) })
    )
  })
})
