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

// vue-chartjs renders a <canvas> via Chart.js which jsdom can't paint.
// Stub the chart wrappers so the component tree mounts without canvas calls.
vi.mock('vue-chartjs', () => ({
  Pie: { name: 'Pie', template: '<div data-test="pie-chart" />' },
  Bar: { name: 'Bar', template: '<div data-test="bar-chart" />' },
}))

import DashboardPage from '../DashboardPage.vue'

const stats = {
  activeProfiles: 80,
  recentSignups: 5,
  blockedUsers: 2,
  reportedProfiles: 3,
  segmentCounts: [
    { segment: 'new', count: 10 },
    { segment: 'returning', count: 30 },
  ],
}

const dailyStats = {
  success: true,
  dailySignups: [
    { date: '2026-04-29', count: 1 },
    { date: '2026-04-30', count: 3 },
    { date: '2026-05-01', count: 2 },
  ],
  dailyLastSeen: [
    { date: '2026-04-29', count: 1 },
    { date: '2026-04-30', count: 3 },
    { date: '2026-05-01', count: 5 },
  ],
  dailyBlockedUsers: [{ date: '2026-04-30', count: 1 }],
  dailyReportedProfiles: [{ date: '2026-04-30', count: 1 }],
  dailyInteractions: [{ date: '2026-04-30', count: 4 }],
  dailyMatches: [{ date: '2026-04-30', count: 2 }],
  dailyMessages: [
    { date: '2026-04-30', count: 7 },
    { date: '2026-05-01', count: 8 },
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/stats') return Promise.resolve({ success: true, stats })
      if (path === '/admin/stats/daily') return Promise.resolve(dailyStats)
      if (path === '/admin/stats/breakdown')
        return Promise.resolve({
          success: true,
          metric: 'interactions',
          range: '72h',
          unit: 'hour',
          buckets: ['2026-05-06T00:00:00.000Z'],
          series: [
            {
              key: 'likes',
              label: 'Likes',
              data: [{ bucket: '2026-05-06T00:00:00.000Z', count: 1 }],
            },
            {
              key: 'anonymous',
              label: 'Anonymous',
              data: [{ bucket: '2026-05-06T00:00:00.000Z', count: 0 }],
            },
            {
              key: 'matches',
              label: 'Matches',
              data: [{ bucket: '2026-05-06T00:00:00.000Z', count: 0 }],
            },
          ],
        })
      return Promise.resolve(null)
    })
  })

  it('renders uniform KPI cards (no Total Users / Total Profiles)', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    const text = wrapper.text()
    expect(text).not.toContain('Total Users')
    expect(text).not.toContain('Total Profiles')

    for (const title of [
      'Signups',
      'Daily Active',
      'Blocked Users',
      'Reported',
      'Interactions',
      'Matches',
      'Messages',
      'Activity Segments',
    ]) {
      expect(text).toContain(title)
    }
  })

  it('shows the 7-day total as the KPI value for activity series', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    const html = wrapper.html()
    // Daily Active KPI = 1 + 3 + 5 = 9
    expect(html).toMatch(/Daily Active[\s\S]*?>\s*9\s*</)
    // Messages KPI = 7 + 8 = 15
    expect(html).toMatch(/Messages[\s\S]*?>\s*15\s*</)
  })

  it('renders an SVG mini bar chart for each KPI series', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    // 7 KPI cards × 1 svg each
    const svgs = wrapper.findAll('.kpi-spark svg')
    expect(svgs.length).toBe(7)
  })

  it('renders the activity segments pie chart', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    expect(wrapper.find('[data-test="pie-chart"]').exists()).toBe(true)
  })

  it('opens the drill-down modal when the Interactions KPI is clicked', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    expect(wrapper.find('.modal').exists()).toBe(false)

    await wrapper.find('[data-test="kpi-interactions"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.modal').exists()).toBe(true)
    // Modal fired off the breakdown request with the default 72h range.
    const breakdownCall = useApiCall.mock.calls.find(
      (c: any[]) => c[0] === '/admin/stats/breakdown'
    )
    expect(breakdownCall).toBeTruthy()
    expect(breakdownCall![1].params).toMatchObject({ metric: 'interactions', range: '72h' })
  })

  it('opens the drill-down modal when the Messages KPI is clicked', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()

    await wrapper.find('[data-test="kpi-messages"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.modal').exists()).toBe(true)
    const breakdownCall = useApiCall.mock.calls.find(
      (c: any[]) => c[0] === '/admin/stats/breakdown' && c[1]?.params?.metric === 'messages'
    )
    expect(breakdownCall).toBeTruthy()
  })
})
