import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiCard from '../KpiCard.vue'

describe('KpiCard', () => {
  it('renders title, subtitle and value', () => {
    const wrapper = mount(KpiCard, { props: { title: 'Likes', subtitle: '3 sent', value: 7 } })
    expect(wrapper.find('.card-title').text()).toBe('Likes')
    expect(wrapper.find('.kpi-subtitle').text()).toBe('3 sent')
    expect(wrapper.find('.kpi-value').text()).toBe('7')
    expect(wrapper.find('.kpi-spark').exists()).toBe(false)
  })

  it('renders one bar per series value, scaled to the max', () => {
    const wrapper = mount(KpiCard, { props: { title: 'T', value: 0, series: [0, 2, 4] } })
    const heights = wrapper.findAll('rect').map((r) => Number(r.attributes('height')))
    expect(heights).toEqual([0, 16, 32])
    expect(wrapper.find('title').exists()).toBe(false)
  })

  it('adds a hover title per bar when series labels are given', () => {
    const wrapper = mount(KpiCard, {
      props: { title: 'T', value: 0, series: [1, 2], seriesLabels: ['2026-11-21', '2026-11-22'] },
    })
    expect(wrapper.findAll('g > title').map((t) => t.text())).toEqual([
      '2026-11-21: 1',
      '2026-11-22: 2',
    ])
  })

  it('stacks segments bottom-up, scaled to the tallest total', () => {
    const wrapper = mount(KpiCard, {
      props: {
        title: 'T',
        value: 0,
        stacks: [
          { label: 'sent', values: [1, 3] },
          { label: 'received', values: [1, 1] },
        ],
        seriesLabels: ['2026-11-21', '2026-11-22'],
      },
    })
    const bars = wrapper.findAll('g')
    const rects = (i: number) =>
      bars[i].findAll('rect').map((r) => ({
        y: Number(r.attributes('y')),
        height: Number(r.attributes('height')),
        opacity: r.attributes('fill-opacity'),
      }))
    // Max total is 4 → 8 units per count; the first segment sits on the baseline.
    expect(rects(0)).toEqual([
      { y: 24, height: 8, opacity: '1' },
      { y: 16, height: 8, opacity: '0.4' },
    ])
    expect(rects(1)).toEqual([
      { y: 8, height: 24, opacity: '1' },
      { y: 0, height: 8, opacity: '0.4' },
    ])
    expect(bars.map((b) => b.find('title').text())).toEqual([
      '2026-11-21: 1 sent · 1 received',
      '2026-11-22: 3 sent · 1 received',
    ])
  })
})
