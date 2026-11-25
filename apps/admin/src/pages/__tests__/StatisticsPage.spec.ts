import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../composables/useApi', () => ({ apiRequest: vi.fn() }))

// vue-chartjs renders a <canvas> via Chart.js which jsdom can't paint.
vi.mock('vue-chartjs', () => ({
  Bar: { name: 'Bar', props: ['data', 'options'], template: '<div />' },
  Line: { name: 'Line', props: ['data', 'options'], template: '<div />' },
}))

import { apiRequest } from '../../composables/useApi'
import StatisticsPage from '../StatisticsPage.vue'

const mockApi = apiRequest as unknown as ReturnType<typeof vi.fn>

const statistics = {
  origins: ['a.example', 'b.example'],
  profiles: { total: 20, social: 19, dating: 11, hidden: 5 },
  dating: {
    gender: { male: 4, female: 6, other: 1 },
    medianAge: { all: 33, male: 31, female: 36 },
    ageBands: [
      { band: '30–34', male: 3, female: 2, other: 1 },
      { band: '35–39', male: 1, female: 4, other: 0 },
    ],
    relationship: [
      { value: 'single', male: 4, female: 3, other: 1 },
      { value: 'married', male: 0, female: 0, other: 0 },
    ],
    hasKids: [{ value: 'yes', male: 1, female: 3, other: 0 }],
  },
  pool: {
    gender: { male: 4, female: 5, other: 0 },
    fewMatches: 2,
    ageBands: [
      { band: '30–34', male: { count: 3, median: 1.5 }, female: { count: 1, median: 4 } },
      { band: '35–39', male: { count: 1, median: 2 }, female: { count: 0, median: null } },
    ],
    distribution: [
      { range: '0–5', male: 4, female: 2, other: 0 },
      { range: '6–15', male: 0, female: 3, other: 0 },
    ],
  },
}

async function mountPage() {
  const wrapper = mount(StatisticsPage)
  await flushPromises()
  return wrapper
}
const bar = (wrapper: any, index: number) => wrapper.findAllComponents({ name: 'Bar' })[index]

describe('StatisticsPage', () => {
  beforeEach(() => {
    mockApi.mockReset()
    mockApi.mockResolvedValue({ success: true, statistics })
  })

  it('summarises the member base', async () => {
    const wrapper = await mountPage()
    const cards = wrapper.findAll('[data-testid="card"]').map((c) => c.text())
    expect(cards[0]).toContain('20')
    expect(cards[1]).toContain('55% of profiles')
    expect(cards[2]).toContain('Women 36, men 31')
    expect(cards[3]).toContain('of 9 have 5 or fewer')
    expect(cards[4]).toContain('25% of profiles')
  })

  it('draws men left and women right of zero in the age pyramid', async () => {
    const wrapper = await mountPage()
    const { datasets } = bar(wrapper, 0).props('data')
    expect(datasets[0]).toMatchObject({ label: 'Men', data: [-3, -1] })
    expect(datasets[1]).toMatchObject({ label: 'Women', data: [2, 4] })
    expect(bar(wrapper, 0).props('options').scales.x.ticks.callback(-3)).toBe('3')
  })

  it('switches the pyramid to the share of each gender', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="mode-share"]').trigger('click')
    expect(bar(wrapper, 0).props('data').datasets[0].data).toEqual([-75, -25])
  })

  it('shows counts behind the pyramid in the tooltip', async () => {
    const wrapper = await mountPage()
    const { label } = bar(wrapper, 0).props('options').plugins.tooltip.callbacks
    expect(label({ datasetIndex: 1, dataIndex: 1 })).toBe('Women: 4 (67%)')
  })

  it('leaves out family situations nobody has', async () => {
    const wrapper = await mountPage()
    expect(bar(wrapper, 1).props('data').labels).toEqual(['Single', 'Has children'])
  })

  it('shows medians for groups of any size and a gap for empty ones', async () => {
    const wrapper = await mountPage()
    const line = wrapper.findComponent({ name: 'Line' })
    expect((line.props('data') as any).datasets.map((d: any) => d.data)).toEqual([
      [1.5, 2],
      [4, null],
    ])
    expect(wrapper.find('[data-testid="pool-table"]').text()).toContain('—')
  })

  it('only lists genders present in the dating pool', async () => {
    const wrapper = await mountPage()
    const data = bar(wrapper, 2).props('data')
    expect(data.labels).toEqual(['Men (4)', 'Women (5)'])
    expect(data.datasets[1].data).toEqual([0, 60])
  })

  it('reloads with the chosen filters', async () => {
    const wrapper = await mountPage()
    expect(mockApi).toHaveBeenLastCalledWith('/admin/statistics', {
      params: { origin: undefined, segment: undefined },
    })
    await wrapper.find('[data-testid="origin"]').setValue('b.example')
    await flushPromises()
    await wrapper.find('[data-testid="segment"]').setValue('frequent')
    await flushPromises()
    expect(mockApi).toHaveBeenLastCalledWith('/admin/statistics', {
      params: { origin: 'b.example', segment: 'frequent' },
    })
  })

  it('shows an error when loading fails', async () => {
    mockApi.mockRejectedValue(new Error('500: boom'))
    const wrapper = await mountPage()
    expect(wrapper.find('.alert-danger').text()).toContain('500: boom')
  })
})
