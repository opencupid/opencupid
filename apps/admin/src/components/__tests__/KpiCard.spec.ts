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
    expect(wrapper.find('rect title').exists()).toBe(false)
  })

  it('adds a hover title per bar when series labels are given', () => {
    const wrapper = mount(KpiCard, {
      props: { title: 'T', value: 0, series: [1, 2], seriesLabels: ['2026-11-21', '2026-11-22'] },
    })
    expect(wrapper.findAll('rect title').map((t) => t.text())).toEqual([
      '2026-11-21: 1',
      '2026-11-22: 2',
    ])
  })
})
