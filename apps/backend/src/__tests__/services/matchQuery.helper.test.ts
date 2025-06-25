import { describe, it, expect, afterEach, vi } from 'vitest';
vi.mock('../../lib/prisma', () => ({ prisma: {} }))
import { subtractYears } from '../../services/matchQuery.service';
import { calculateAge } from '../../services/matchQuery.service';
import { date } from 'zod';

describe('subtractYears', () => {
  it('should subtract years from a date', () => {
    const date = new Date('2020-06-15');
    const result = subtractYears(date, 5);
    expect(result.getFullYear()).toBe(2015);
    expect(result.getMonth()).toBe(5); // June is month 5 (0-based)
    expect(result.getDate()).toBe(15);
  });

  it('should handle leap years correctly', () => {
    const date = new Date('2020-02-29');
    const result = subtractYears(date, 1);
    // 2019 is not a leap year, so Feb 29 becomes Mar 1
    expect(result.getFullYear()).toBe(2019);
    expect(result.getMonth()).toBe(2); // March is month 2 (0-based)
    expect(result.getDate()).toBe(1);
  });

  it('should not mutate the original date', () => {
    const date = new Date('2020-01-01');
    subtractYears(date, 2);
    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  it('should handle subtracting zero years', () => {
    const date = new Date(Date.UTC(2022, 11, 31)); // December 31, 2022
    const result = subtractYears(date, 0);
    expect(result.getFullYear()).toBe(2022);
    expect(result.getMonth()).toBe(11); // December is month 11
    expect(result.getDate()).toBe(31);
  });

  describe('calculateAge', () => {

    const originalDate = global.Date;

    const mockToday = (dateString: string) => {
      const fixedDate = new Date(dateString);
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new originalDate(fixedDate);
          }
          // Call the parent Date constructor with the provided arguments
          // @ts-expect-error sdf
          return super(...args);
        }
        static now() {
          return fixedDate.getTime();
        }
        static parse = originalDate.parse;
        static UTC = originalDate.UTC;
      } as unknown as DateConstructor;
    };

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should calculate correct age when birthday has passed this year', () => {
      mockToday('2024-06-15');
      const birthday = new Date('2000-01-01');
      expect(calculateAge(birthday)).toBe(24);
    });

    it('should calculate correct age when birthday is today', () => {
      mockToday('2024-06-15');
      const birthday = new Date('2000-06-15');
      expect(calculateAge(birthday)).toBe(24);
    });

    it('should calculate correct age when birthday has not occurred yet this year', () => {
      mockToday('2024-06-15');
      const birthday = new Date('2000-12-31');
      expect(calculateAge(birthday)).toBe(23);
    });

    it('should handle leap year birthdays', () => {
      mockToday('2023-02-28');
      const birthday = new Date('2000-02-29');
      expect(calculateAge(birthday)).toBe(22);
      mockToday('2024-02-29');
      expect(calculateAge(birthday)).toBe(24);
    });

    it('should return 0 if birthday is today and this year', () => {
      mockToday('2024-06-15');
      const birthday = new Date('2024-06-15');
      expect(calculateAge(birthday)).toBe(0);
    });

    it('should return negative age if birthday is in the future', () => {
      mockToday('2024-06-15');
      const birthday = new Date('2025-01-01');
      expect(calculateAge(birthday)).toBe(-1);
    });
  });
});



