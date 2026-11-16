import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../composables/useApi', () => ({ apiRequest: vi.fn() }))

import { apiRequest } from '../../composables/useApi'
import ActivityPage from '../ActivityPage.vue'

const mockApi = apiRequest as unknown as ReturnType<typeof vi.fn>

const alice = {
  id: 'p1',
  publicName: 'Alice',
  hasFace: true,
  isDatingActive: false,
  lastSeenAt: '2026-11-09T12:00:00Z',
  messagesSent: 4,
  messagesReceived: 7,
  likesSent: 2,
}
const bob = {
  id: 'p2',
  publicName: 'Bob',
  hasFace: false,
  isDatingActive: true,
  lastSeenAt: '2026-11-08T12:00:00Z',
  messagesSent: 0,
  messagesReceived: 1,
  likesSent: 5,
}

const rows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-testid="activity"] tbody tr')

describe('ActivityPage', () => {
  beforeEach(() => {
    mockApi.mockReset()
    mockApi.mockResolvedValue({ profiles: [alice, bob], total: 2 })
  })

  it('fetches the first page of activity', async () => {
    mount(ActivityPage)
    await flushPromises()

    expect(mockApi).toHaveBeenCalledWith('/admin/activity', {
      params: { page: 1, pageSize: 25 },
    })
  })

  it('renders a row per profile in the order returned', async () => {
    const wrapper = mount(ActivityPage)
    await flushPromises()

    const [first, second] = rows(wrapper)
    expect(wrapper.text()).toContain('2 profiles')
    expect(first!.text()).toContain('Alice')
    expect(second!.text()).toContain('Bob')
  })

  it('shows message, like counts and face/dating flags', async () => {
    const wrapper = mount(ActivityPage)
    await flushPromises()

    const cells = rows(wrapper)[0]!
      .findAll('td')
      .map((c) => c.text())
    expect(cells.slice(2, 7)).toEqual(['4', '7', '2', '✓', '—'])
    const bobCells = rows(wrapper)[1]!
      .findAll('td')
      .map((c) => c.text())
    expect(bobCells.slice(5, 7)).toEqual(['—', '✓'])
  })

  it('links each row to the public profile', async () => {
    const wrapper = mount(ActivityPage)
    await flushPromises()

    const links = wrapper.findAll('[data-testid="view-public-profile"]')
    expect(links).toHaveLength(2)
    expect(links[0]!.attributes('href')).toMatch(/\/profile\/p1$/)
  })

  it('shows an empty state', async () => {
    mockApi.mockResolvedValue({ profiles: [], total: 0 })
    const wrapper = mount(ActivityPage)
    await flushPromises()

    expect(wrapper.text()).toContain('No activity')
  })

  it('shows the error when the request fails', async () => {
    mockApi.mockRejectedValue(new Error('500: boom'))
    const wrapper = mount(ActivityPage)
    await flushPromises()

    expect(wrapper.find('.alert-danger').text()).toContain('500: boom')
  })
})
