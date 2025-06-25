/**
 * Report Period Value Object Tests
 *
 * Comprehensive unit tests for ReportPeriod value object covering:
 * - All predefined period types
 * - Custom date range creation
 * - Date validation logic
 * - Period calculations and utilities
 * - Error handling scenarios
 * - Edge cases and boundary conditions
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import { ReportPeriod, ReportPeriodType } from '../report-period';

describe('ReportPeriod Value Object', () => {
  const fixedDate = new Date('2024-01-15T10:30:00.000Z'); // Monday, January 15, 2024

  beforeEach(() => {
    // Mock Date.now() to return our fixed date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fromType() - Predefined Periods', () => {
    it('should create TODAY period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      expect(period.type).toBe(ReportPeriodType.TODAY);
      expect(period.startDate).toEqual(new Date('2024-01-15T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(1);
      expect(period.getLabel()).toBe('Today');
    });

    it('should create YESTERDAY period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.YESTERDAY);

      expect(period.type).toBe(ReportPeriodType.YESTERDAY);
      expect(period.startDate).toEqual(new Date('2024-01-14T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-14T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(1);
      expect(period.getLabel()).toBe('Yesterday');
    });

    it('should create LAST_7_DAYS period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_7_DAYS);

      expect(period.type).toBe(ReportPeriodType.LAST_7_DAYS);
      expect(period.startDate).toEqual(new Date('2024-01-09T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(7);
      expect(period.getLabel()).toBe('Last 7 Days');
    });

    it('should create LAST_30_DAYS period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS);

      expect(period.type).toBe(ReportPeriodType.LAST_30_DAYS);
      expect(period.startDate).toEqual(new Date('2023-12-17T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(30);
      expect(period.getLabel()).toBe('Last 30 Days');
    });

    it('should create THIS_WEEK period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.THIS_WEEK);

      expect(period.type).toBe(ReportPeriodType.THIS_WEEK);
      // Week should start on Monday (Jan 15, 2024)
      expect(period.startDate).toEqual(new Date('2024-01-15T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getLabel()).toBe('This Week');
    });

    it('should create LAST_WEEK period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_WEEK);

      expect(period.type).toBe(ReportPeriodType.LAST_WEEK);
      expect(period.getLabel()).toBe('Last Week');
      // Should be a 7-day period
      expect(period.getDurationInDays()).toBe(7);
    });

    it('should create THIS_MONTH period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.THIS_MONTH);

      expect(period.type).toBe(ReportPeriodType.THIS_MONTH);
      expect(period.startDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getLabel()).toBe('This Month');
    });

    it('should create LAST_MONTH period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_MONTH);

      expect(period.type).toBe(ReportPeriodType.LAST_MONTH);
      expect(period.startDate).toEqual(new Date('2023-12-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2023-12-31T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(31);
      expect(period.getLabel()).toBe('Last Month');
    });

    it('should create THIS_QUARTER period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.THIS_QUARTER);

      expect(period.type).toBe(ReportPeriodType.THIS_QUARTER);
      expect(period.startDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getLabel()).toBe('This Quarter');
    });

    it('should create LAST_QUARTER period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_QUARTER);

      expect(period.type).toBe(ReportPeriodType.LAST_QUARTER);
      expect(period.startDate).toEqual(new Date('2023-10-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2023-12-31T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(92); // Oct: 31, Nov: 30, Dec: 31
      expect(period.getLabel()).toBe('Last Quarter');
    });

    it('should create THIS_YEAR period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.THIS_YEAR);

      expect(period.type).toBe(ReportPeriodType.THIS_YEAR);
      expect(period.startDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-01-15T23:59:59.999Z'));
      expect(period.getLabel()).toBe('This Year');
    });

    it('should create LAST_YEAR period correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.LAST_YEAR);

      expect(period.type).toBe(ReportPeriodType.LAST_YEAR);
      expect(period.startDate).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2023-12-31T23:59:59.999Z'));
      expect(period.getDurationInDays()).toBe(365); // 2023 is not a leap year
      expect(period.getLabel()).toBe('Last Year');
    });

    it('should handle timezone parameter', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY, 'America/New_York');

      expect(period.timezone).toBe('America/New_York');
      expect(period.type).toBe(ReportPeriodType.TODAY);
    });

    it('should throw error for unsupported period type', () => {
      expect(() => {
        ReportPeriod.fromType('INVALID_TYPE' as ReportPeriodType);
      }).toThrow('Unsupported period type: INVALID_TYPE');
    });
  });

  describe('fromDateRange() - Custom Periods', () => {
    it('should create custom period with valid date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const period = ReportPeriod.fromDateRange(startDate, endDate);

      expect(period.type).toBe(ReportPeriodType.CUSTOM);
      expect(period.startDate).toEqual(startDate);
      expect(period.endDate).toEqual(endDate);
      expect(period.timezone).toBe('UTC');
      expect(period.getDurationInDays()).toBe(31);
      expect(period.getLabel()).toBe('1/1/2024 - 1/31/2024');
    });

    it('should create custom period with timezone', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const period = ReportPeriod.fromDateRange(startDate, endDate, 'Europe/London');

      expect(period.timezone).toBe('Europe/London');
    });

    it('should create immutable dates', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const period = ReportPeriod.fromDateRange(startDate, endDate);

      // Modify original dates
      startDate.setDate(15);
      endDate.setDate(15);

      // Period should not be affected
      expect(period.startDate).toEqual(new Date('2024-01-01'));
      expect(period.endDate).toEqual(new Date('2024-01-31'));
    });

    it('should throw error for invalid start date', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2024-01-31');

      expect(() => {
        ReportPeriod.fromDateRange(invalidDate, validDate);
      }).toThrow('Invalid start date');
    });

    it('should throw error for invalid end date', () => {
      const validDate = new Date('2024-01-01');
      const invalidDate = new Date('invalid');

      expect(() => {
        ReportPeriod.fromDateRange(validDate, invalidDate);
      }).toThrow('Invalid end date');
    });

    it('should throw error when start date is after end date', () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      expect(() => {
        ReportPeriod.fromDateRange(startDate, endDate);
      }).toThrow('Start date must be before end date');
    });

    it('should throw error when start date equals end date', () => {
      const date = new Date('2024-01-15');

      expect(() => {
        ReportPeriod.fromDateRange(date, new Date(date));
      }).toThrow('Start date must be before end date');
    });

    it('should throw error for date range exceeding 1 year', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-01-02'); // More than 365 days

      expect(() => {
        ReportPeriod.fromDateRange(startDate, endDate);
      }).toThrow('Date range cannot exceed 1 year');
    });

    it('should allow exactly 1 year range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      expect(() => {
        ReportPeriod.fromDateRange(startDate, endDate);
      }).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should calculate duration in days correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const period = ReportPeriod.fromDateRange(startDate, endDate);

      expect(period.getDurationInDays()).toBe(10);
    });

    it('should check if period contains a date', () => {
      const period = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(period.contains(new Date('2024-01-15'))).toBe(true);
      expect(period.contains(new Date('2024-01-01'))).toBe(true);
      expect(period.contains(new Date('2024-01-31'))).toBe(true);
      expect(period.contains(new Date('2023-12-31'))).toBe(false);
      expect(period.contains(new Date('2024-02-01'))).toBe(false);
    });

    it('should split period into daily intervals', () => {
      const period = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-03'));

      const intervals = period.splitInto('day');

      expect(intervals).toHaveLength(3);
      expect(intervals[0]?.startDate).toEqual(new Date('2024-01-01'));
      expect(intervals[0]?.endDate).toEqual(new Date('2024-01-01T23:59:59.999Z'));
      expect(intervals[1]?.startDate).toEqual(new Date('2024-01-02'));
      expect(intervals[1]?.endDate).toEqual(new Date('2024-01-02T23:59:59.999Z'));
      expect(intervals[2]?.startDate).toEqual(new Date('2024-01-03'));
      expect(intervals[2]?.endDate).toEqual(new Date('2024-01-03T23:59:59.999Z'));
    });

    it('should split period into weekly intervals', () => {
      const period = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-20'));

      const intervals = period.splitInto('week');

      expect(intervals).toHaveLength(3);
      expect(intervals[0]?.getDurationInDays()).toBe(7);
      expect(intervals[1]?.getDurationInDays()).toBe(7);
      expect(intervals[2]?.getDurationInDays()).toBe(6); // Remaining days
    });

    it('should split period into monthly intervals', () => {
      const period = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-03-15'));

      const intervals = period.splitInto('month');

      expect(intervals).toHaveLength(3);
      expect(intervals[0]?.startDate).toEqual(new Date('2024-01-01'));
      expect(intervals[1]?.startDate).toEqual(new Date('2024-02-01'));
      expect(intervals[2]?.startDate).toEqual(new Date('2024-03-01'));
    });

    it('should handle single day split correctly', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      const intervals = period.splitInto('day');

      expect(intervals).toHaveLength(1);
      expect(intervals[0].startDate).toEqual(period.startDate);
      expect(intervals[0].endDate).toEqual(period.endDate);
    });
  });

  describe('Equality and Comparison', () => {
    it('should return true for equal periods', () => {
      const period1 = ReportPeriod.fromType(ReportPeriodType.TODAY);
      const period2 = ReportPeriod.fromType(ReportPeriodType.TODAY);

      expect(period1.equals(period2)).toBe(true);
    });

    it('should return false for different period types', () => {
      const period1 = ReportPeriod.fromType(ReportPeriodType.TODAY);
      const period2 = ReportPeriod.fromType(ReportPeriodType.YESTERDAY);

      expect(period1.equals(period2)).toBe(false);
    });

    it('should return false for different dates', () => {
      const period1 = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
      const period2 = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-30'));

      expect(period1.equals(period2)).toBe(false);
    });

    it('should return false for different timezones', () => {
      const period1 = ReportPeriod.fromType(ReportPeriodType.TODAY, 'UTC');
      const period2 = ReportPeriod.fromType(ReportPeriodType.TODAY, 'America/New_York');

      expect(period1.equals(period2)).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful toString', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      const str = period.toString();

      expect(str).toContain('ReportPeriod');
      expect(str).toContain('TODAY');
      expect(str).toContain('2024-01-15');
    });

    it('should provide custom period label', () => {
      const period = ReportPeriod.fromDateRange(new Date('2024-01-01'), new Date('2024-01-31'));

      const label = period.getLabel();
      expect(label).toContain('2024');
      expect(label).toContain('-');
    });

    it('should handle unknown period type in label', () => {
      // This is a bit of a hack to test the default case
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);
      // Override the type property to test default case
      Object.defineProperty(period, 'type', {
        get: () => 'UNKNOWN_TYPE' as any,
      });

      expect(period.getLabel()).toBe('Unknown Period');
    });
  });

  describe('Immutability', () => {
    it('should return new Date objects from getters', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      const startDate1 = period.startDate;
      const startDate2 = period.startDate;

      expect(startDate1).toEqual(startDate2);
      expect(startDate1).not.toBe(startDate2); // Different object instances
    });

    it('should not allow modification of returned dates', () => {
      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      const originalStart = period.startDate;
      const modifiableStart = period.startDate;
      modifiableStart.setDate(20);

      // Original period should be unchanged
      expect(period.startDate).toEqual(originalStart);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year correctly', () => {
      jest.setSystemTime(new Date('2024-02-29T10:30:00.000Z')); // Leap year

      const period = ReportPeriod.fromType(ReportPeriodType.TODAY);

      expect(period.startDate).toEqual(new Date('2024-02-29T00:00:00.000Z'));
      expect(period.endDate).toEqual(new Date('2024-02-29T23:59:59.999Z'));
    });

    it('should handle year boundary correctly', () => {
      jest.setSystemTime(new Date('2024-01-01T10:30:00.000Z'));

      const lastYear = ReportPeriod.fromType(ReportPeriodType.LAST_YEAR);

      expect(lastYear.startDate).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(lastYear.endDate).toEqual(new Date('2023-12-31T23:59:59.999Z'));
    });

    it('should handle month boundary correctly', () => {
      jest.setSystemTime(new Date('2024-03-01T10:30:00.000Z'));

      const lastMonth = ReportPeriod.fromType(ReportPeriodType.LAST_MONTH);

      expect(lastMonth.startDate).toEqual(new Date('2024-02-01T00:00:00.000Z'));
      expect(lastMonth.endDate).toEqual(new Date('2024-02-29T23:59:59.999Z')); // February in leap year
    });

    it('should handle Sunday as week start correctly', () => {
      jest.setSystemTime(new Date('2024-01-14T10:30:00.000Z')); // Sunday

      const thisWeek = ReportPeriod.fromType(ReportPeriodType.THIS_WEEK);

      // Should start on Monday (Jan 8, 2024)
      expect(thisWeek.startDate.getDay()).toBe(1); // Monday
    });
  });
});
