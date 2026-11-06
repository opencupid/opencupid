import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../composables/useApi', () => ({ apiRequest: vi.fn() }))

// vue-chartjs renders a <canvas> via Chart.js which jsdom can't paint.
vi.mock('vue-chartjs', () => ({
  Pie: { name: 'Pie', props: ['data', 'options'], template: '<div data-testid="pie" />' },
}))

import { apiRequest } from '../../composables/useApi'
import ExitSurveysPage from '../ExitSurveysPage.vue'

const mockApi = apiRequest as unknown as ReturnType<typeof vi.fn>

const counts = { technical_issue: 1, not_a_good_fit: 0, bad_experience: 0, other: 3 }
const preset = {
  id: 's1',
  reason: 'technical_issue',
  comment: null,
  createdAt: '2026-11-02T10:00:00Z',
}
const other = {
  id: 's2',
  reason: 'other',
  comment: '<b>Too quiet</b>',
  createdAt: '2026-11-01T10:00:00Z',
}

const summaryRows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-testid="summary"] tbody tr').map((r) => r.text())

describe('ExitSurveysPage', () => {
  beforeEach(() => {
    mockApi.mockReset()
    mockApi.mockResolvedValue({ surveys: [preset, other], total: 2, counts })
  })

  it('summarises every reason with its count and share', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    expect(wrapper.text()).toContain('4 answers')
    const rows = summaryRows(wrapper)
    expect(rows[0]).toContain('Technical issue')
    expect(rows[0]).toContain('25%')
    expect(rows[1]).toContain('0%')
    expect(rows[3]).toContain('Other')
    expect(rows[3]).toContain('75%')
  })

  it('charts every reason in a fixed order, described for screen readers', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    const pie = wrapper.findComponent({ name: 'Pie' })
    const data = pie.props('data') as any
    expect(data.labels[0]).toBe('Technical issue')
    expect(data.datasets[0].data).toEqual([1, 0, 0, 3])
    expect(new Set(data.datasets[0].backgroundColor).size).toBe(4)
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toContain('Other: 75%')
  })

  it('keeps the chart and its colours when the list is filtered', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()
    const before = wrapper.findComponent({ name: 'Pie' }).props('data')
    mockApi.mockResolvedValue({ surveys: [other], total: 1, counts })

    await wrapper.find('select').setValue('other')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'Pie' }).props('data')).toEqual(before)
  })

  it('shows count and share in the slice tooltip', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    const options = wrapper.findComponent({ name: 'Pie' }).props('options') as any
    expect(options.plugins.tooltip.callbacks.label({ formattedValue: '3', dataIndex: 3 })).toBe(
      '3 (75%)'
    )
  })

  it('lists answers with the member-facing label and comment as plain text', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="answers"] tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Technical issue')
    expect(rows[0]!.text()).toContain('—')
    expect(rows[1]!.find('.comment').text()).toBe('<b>Too quiet</b>')
    expect(rows[1]!.find('.comment b').exists()).toBe(false)
  })

  it('refetches from the first page when the filter changes and keeps the summary', async () => {
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()
    mockApi.mockResolvedValue({ surveys: [other], total: 1, counts })

    await wrapper.find('select').setValue('other')
    await flushPromises()

    expect(mockApi).toHaveBeenLastCalledWith('/admin/exit-surveys', {
      params: { page: 1, pageSize: 25, reason: 'other' },
    })
    expect(wrapper.findAll('[data-testid="answers"] tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('4 answers')
  })

  it('shows an empty state when there are no answers', async () => {
    mockApi.mockResolvedValue({
      surveys: [],
      total: 0,
      counts: { technical_issue: 0, not_a_good_fit: 0, bad_experience: 0, other: 0 },
    })
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    expect(wrapper.text()).toContain('No answers')
    expect(wrapper.find('[data-testid="pie"]').exists()).toBe(false)
    expect(summaryRows(wrapper)[0]).toContain('—')
  })

  it('shows the error when loading fails', async () => {
    mockApi.mockRejectedValue(new Error('500: boom'))
    const wrapper = mount(ExitSurveysPage)
    await flushPromises()

    expect(wrapper.find('.alert-danger').text()).toBe('500: boom')
  })
})
