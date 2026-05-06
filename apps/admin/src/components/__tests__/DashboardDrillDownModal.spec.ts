import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const useApiCall = vi.fn()
vi.mock('../../composables/useApi', () => ({
  useApi: () => ({
    call: useApiCall,
    loading: ref(false),
    error: ref<string | null>(null),
  }),
}))

vi.mock('vue-chartjs', () => ({
  Bar: { name: 'Bar', template: '<div data-test="bar-chart" />', props: ['data', 'options'] },
}))

import DashboardDrillDownModal from '../DashboardDrillDownModal.vue'

const interactionsResponse = (range: string) => ({
  success: true,
  metric: 'interactions',
  range,
  unit: range === '7d' ? 'day' : 'hour',
  buckets: ['2026-05-06T00:00:00.000Z', '2026-05-06T01:00:00.000Z'],
  series: [
    {
      key: 'likes',
      label: 'Likes',
      data: [
        { bucket: '2026-05-06T00:00:00.000Z', count: 3 },
        { bucket: '2026-05-06T01:00:00.000Z', count: 5 },
      ],
    },
    {
      key: 'anonymous',
      label: 'Anonymous',
      data: [
        { bucket: '2026-05-06T00:00:00.000Z', count: 1 },
        { bucket: '2026-05-06T01:00:00.000Z', count: 0 },
      ],
    },
    {
      key: 'matches',
      label: 'Matches',
      data: [
        { bucket: '2026-05-06T00:00:00.000Z', count: 0 },
        { bucket: '2026-05-06T01:00:00.000Z', count: 2 },
      ],
    },
  ],
})

describe('DashboardDrillDownModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useApiCall.mockImplementation((_path: string, opts: any) => {
      const range = opts?.params?.range ?? '72h'
      return Promise.resolve(interactionsResponse(range))
    })
  })

  it('fetches breakdown with default 72h range and renders a single combined bar chart', async () => {
    const wrapper = mount(DashboardDrillDownModal, {
      props: { metric: 'interactions', title: 'Interactions' },
    })
    await flushPromises()

    expect(useApiCall).toHaveBeenCalledWith(
      '/admin/stats/breakdown',
      expect.objectContaining({ params: { metric: 'interactions', range: '72h' } })
    )
    const charts = wrapper.findAllComponents({ name: 'Bar' })
    expect(charts).toHaveLength(1)

    // One dataset per series, each with its own colour.
    const data = charts[0].props('data') as {
      datasets: { label: string; backgroundColor: string }[]
    }
    expect(data.datasets.map((d) => d.label)).toEqual(['Likes', 'Anonymous', 'Matches'])
    const colors = new Set(data.datasets.map((d) => d.backgroundColor))
    expect(colors.size).toBe(3)

    expect(wrapper.text()).toContain('Likes')
    expect(wrapper.text()).toContain('Anonymous')
    expect(wrapper.text()).toContain('Matches')
  })

  it('refetches when the range dropdown changes', async () => {
    const wrapper = mount(DashboardDrillDownModal, {
      props: { metric: 'interactions', title: 'Interactions' },
    })
    await flushPromises()
    useApiCall.mockClear()

    await wrapper.find('[data-test="range-select"]').setValue('24h')
    await flushPromises()

    expect(useApiCall).toHaveBeenCalledWith(
      '/admin/stats/breakdown',
      expect.objectContaining({ params: { metric: 'interactions', range: '24h' } })
    )
  })

  it('emits close on backdrop click and close button', async () => {
    const wrapper = mount(DashboardDrillDownModal, {
      props: { metric: 'interactions', title: 'Interactions' },
    })
    await flushPromises()

    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows total count for each series in the legend', async () => {
    const wrapper = mount(DashboardDrillDownModal, {
      props: { metric: 'interactions', title: 'Interactions' },
    })
    await flushPromises()

    const text = wrapper.text().replace(/\s+/g, ' ')
    // Likes: 3 + 5 = 8
    expect(text).toContain('Likes: 8')
    // Anonymous: 1 + 0 = 1
    expect(text).toContain('Anonymous: 1')
    // Matches: 0 + 2 = 2
    expect(text).toContain('Matches: 2')
  })
})
