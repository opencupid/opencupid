import { describe, it, expect, afterEach, vi } from 'vitest'
vi.mock('../../lib/prisma', () => ({ prisma: {} }))
import {
  birthdayRangeForAgePrefs,
  isAgeCompatible,
  subtractYears,
} from '../../services/profileMatch.service'
import { calculateAge } from '@zod/match/filters.form'

describe('subtractYears', () => {
  it('should subtract years from a date', () => {
    const date = new Date('2020-06-15')
    const result = subtractYears(date, 5)
    expect(result.getFullYear()).toBe(2015)
    expect(result.getMonth()).toBe(5) // June is month 5 (0-based)
    expect(result.getDate()).toBe(15)
  })

  it('should handle leap years correctly', () => {
    const date = new Date('2020-02-29')
    const result = subtractYears(date, 1)
    // 2019 is not a leap year, so Feb 29 becomes Mar 1
    expect(result.getFullYear()).toBe(2019)
    expect(result.getMonth()).toBe(2) // March is month 2 (0-based)
    expect(result.getDate()).toBe(1)
  })

  it('should not mutate the original date', () => {
    const date = new Date('2020-01-01')
    subtractYears(date, 2)
    expect(date.getFullYear()).toBe(2020)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(1)
  })

  it('should handle subtracting zero years', () => {
    const date = new Date(Date.UTC(2022, 11, 31)) // December 31, 2022
    const result = subtractYears(date, 0)
    expect(result.getFullYear()).toBe(2022)
    expect(result.getMonth()).toBe(11) // December is month 11
    expect(result.getDate()).toBe(31)
  })

  describe('calculateAge', () => {
    const originalDate = global.Date

    const mockToday = (dateString: string) => {
      const fixedDate = new Date(dateString)
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new originalDate(fixedDate)
          }
          // Call the parent Date constructor with the provided arguments
          // @ts-expect-error sdf
          return super(...args)
        }
        static now() {
          return fixedDate.getTime()
        }
        static parse = originalDate.parse
        static UTC = originalDate.UTC
      } as unknown as DateConstructor
    }

    afterEach(() => {
      global.Date = originalDate
    })

    it('should calculate correct age when birthday has passed this year', () => {
      mockToday('2024-06-15')
      const birthday = new Date('2000-01-01')
      expect(calculateAge(birthday)).toBe(24)
    })

    it('should calculate correct age when birthday is today', () => {
      mockToday('2024-06-15')
      const birthday = new Date('2000-06-15')
      expect(calculateAge(birthday)).toBe(24)
    })

    it('should calculate correct age when birthday has not occurred yet this year', () => {
      mockToday('2024-06-15')
      const birthday = new Date('2000-12-31')
      expect(calculateAge(birthday)).toBe(23)
    })

    it('should handle leap year birthdays', () => {
      mockToday('2023-02-28')
      const birthday = new Date('2000-02-29')
      expect(calculateAge(birthday)).toBe(22)
      mockToday('2024-02-29')
      expect(calculateAge(birthday)).toBe(24)
    })

    it('should return 0 if birthday is today and this year', () => {
      mockToday('2024-06-15')
      const birthday = new Date('2024-06-15')
      expect(calculateAge(birthday)).toBe(0)
    })

    it('should return negative age if birthday is in the future', () => {
      mockToday('2024-06-15')
      const birthday = new Date('2025-01-01')
      expect(calculateAge(birthday)).toBe(-1)
    })
  })
})

describe('birthdayRangeForAgePrefs', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const inRange = (birthday: Date, range: { gt: Date; lte: Date }) =>
    birthday > range.gt && birthday <= range.lte

  it('accepts a candidate one year past prefAgeMax whose birthday already passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-21T14:00:00'))
    const birthday = new Date('1975-03-15T00:00:00') // 51 years old
    expect(isAgeCompatible(calculateAge(birthday), 29, 50)).toBe(true)
    expect(inRange(birthday, birthdayRangeForAgePrefs(29, 50))).toBe(true)
  })

  it('agrees with isAgeCompatible for birthdays around both boundaries', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-21T14:00:00'))
    const range = birthdayRangeForAgePrefs(30, 40)
    // Sweep daily birthdays covering candidates aged 26 to 44 (both bounds ±1)
    const start = new Date('1982-01-01T00:00:00')
    const end = new Date('2000-12-31T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      expect(inRange(d, range), d.toDateString()).toBe(isAgeCompatible(calculateAge(d), 30, 40))
    }
  })
})

describe('isAgeCompatible', () => {
  it('accepts ages up to 3 years outside the preferred range', () => {
    expect(isAgeCompatible(27, 30, 40)).toBe(true)
    expect(isAgeCompatible(43, 30, 40)).toBe(true)
  })

  it('rejects ages more than 3 years outside the preferred range', () => {
    expect(isAgeCompatible(26, 30, 40)).toBe(false)
    expect(isAgeCompatible(44, 30, 40)).toBe(false)
  })
})
