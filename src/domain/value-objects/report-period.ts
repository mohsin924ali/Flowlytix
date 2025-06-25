/**
 * Report Period Value Object
 *
 * Represents a date range for report generation with validation and business logic.
 * Provides predefined periods and custom date range support.
 *
 * @domain Reports and Analytics
 * @pattern Value Object
 * @version 1.0.0
 */

/**
 * Predefined report period types
 */
export enum ReportPeriodType {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

/**
 * Report period configuration
 */
export interface ReportPeriodProps {
  readonly type: ReportPeriodType;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly timezone?: string;
}

/**
 * Report period value object
 */
export class ReportPeriod {
  private constructor(private readonly props: ReportPeriodProps) {}

  /**
   * Create report period from predefined type
   */
  static fromType(type: ReportPeriodType, timezone = 'UTC'): ReportPeriod {
    const now = new Date();
    const { startDate, endDate } = this.calculateDatesForType(type, now, timezone);

    return new ReportPeriod({
      type,
      startDate,
      endDate,
      timezone,
    });
  }

  /**
   * Create custom report period
   */
  static fromDateRange(startDate: Date, endDate: Date, timezone = 'UTC'): ReportPeriod {
    this.validateDateRange(startDate, endDate);

    return new ReportPeriod({
      type: ReportPeriodType.CUSTOM,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timezone,
    });
  }

  /**
   * Calculate dates for predefined period types
   */
  private static calculateDatesForType(
    type: ReportPeriodType,
    referenceDate: Date,
    timezone: string
  ): { startDate: Date; endDate: Date } {
    const ref = new Date(referenceDate);
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case ReportPeriodType.TODAY:
        startDate = this.getStartOfDay(ref, timezone);
        endDate = this.getEndOfDay(ref, timezone);
        break;

      case ReportPeriodType.YESTERDAY:
        const yesterday = new Date(ref);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = this.getStartOfDay(yesterday, timezone);
        endDate = this.getEndOfDay(yesterday, timezone);
        break;

      case ReportPeriodType.LAST_7_DAYS:
        endDate = this.getEndOfDay(ref, timezone);
        startDate = this.getStartOfDay(new Date(ref.getTime() - 6 * 24 * 60 * 60 * 1000), timezone);
        break;

      case ReportPeriodType.LAST_30_DAYS:
        endDate = this.getEndOfDay(ref, timezone);
        startDate = this.getStartOfDay(new Date(ref.getTime() - 29 * 24 * 60 * 60 * 1000), timezone);
        break;

      case ReportPeriodType.THIS_WEEK:
        startDate = this.getStartOfWeek(ref, timezone);
        endDate = this.getEndOfDay(ref, timezone);
        break;

      case ReportPeriodType.LAST_WEEK:
        const lastWeekEnd = new Date(ref);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        endDate = this.getEndOfDay(lastWeekEnd, timezone);
        startDate = this.getStartOfWeek(new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000), timezone);
        break;

      case ReportPeriodType.THIS_MONTH:
        startDate = this.getStartOfMonth(ref, timezone);
        endDate = this.getEndOfDay(ref, timezone);
        break;

      case ReportPeriodType.LAST_MONTH:
        const lastMonthDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
        startDate = this.getStartOfMonth(lastMonthDate, timezone);
        endDate = this.getEndOfMonth(lastMonthDate, timezone);
        break;

      case ReportPeriodType.THIS_QUARTER:
        startDate = this.getStartOfQuarter(ref, timezone);
        endDate = this.getEndOfDay(ref, timezone);
        break;

      case ReportPeriodType.LAST_QUARTER:
        const lastQuarterDate = new Date(ref.getFullYear(), ref.getMonth() - 3, 1);
        startDate = this.getStartOfQuarter(lastQuarterDate, timezone);
        endDate = this.getEndOfQuarter(lastQuarterDate, timezone);
        break;

      case ReportPeriodType.THIS_YEAR:
        startDate = this.getStartOfYear(ref, timezone);
        endDate = this.getEndOfDay(ref, timezone);
        break;

      case ReportPeriodType.LAST_YEAR:
        const lastYear = ref.getFullYear() - 1;
        startDate = this.getStartOfYear(new Date(lastYear, 0, 1), timezone);
        endDate = this.getEndOfYear(new Date(lastYear, 11, 31), timezone);
        break;

      default:
        throw new Error(`Unsupported period type: ${type}`);
    }

    return { startDate, endDate };
  }

  /**
   * Validate date range
   */
  private static validateDateRange(startDate: Date, endDate: Date): void {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new Error('Invalid end date');
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      throw new Error('Date range cannot exceed 1 year');
    }
  }

  /**
   * Utility methods for date calculations
   */
  private static getStartOfDay(date: Date, timezone: string): Date {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  private static getEndOfDay(date: Date, timezone: string): Date {
    const result = new Date(date);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }

  private static getStartOfWeek(date: Date, timezone: string): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    result.setDate(diff);
    return this.getStartOfDay(result, timezone);
  }

  private static getStartOfMonth(date: Date, timezone: string): Date {
    const result = new Date(date.getFullYear(), date.getMonth(), 1);
    return this.getStartOfDay(result, timezone);
  }

  private static getEndOfMonth(date: Date, timezone: string): Date {
    const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return this.getEndOfDay(result, timezone);
  }

  private static getStartOfQuarter(date: Date, timezone: string): Date {
    const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
    const result = new Date(date.getFullYear(), quarterMonth, 1);
    return this.getStartOfDay(result, timezone);
  }

  private static getEndOfQuarter(date: Date, timezone: string): Date {
    const quarterMonth = Math.floor(date.getMonth() / 3) * 3 + 2;
    const result = new Date(date.getFullYear(), quarterMonth + 1, 0);
    return this.getEndOfDay(result, timezone);
  }

  private static getStartOfYear(date: Date, timezone: string): Date {
    const result = new Date(date.getFullYear(), 0, 1);
    return this.getStartOfDay(result, timezone);
  }

  private static getEndOfYear(date: Date, timezone: string): Date {
    const result = new Date(date.getFullYear(), 11, 31);
    return this.getEndOfDay(result, timezone);
  }

  // Getters
  get type(): ReportPeriodType {
    return this.props.type;
  }

  get startDate(): Date {
    return new Date(this.props.startDate);
  }

  get endDate(): Date {
    return new Date(this.props.endDate);
  }

  get timezone(): string {
    return this.props.timezone || 'UTC';
  }

  /**
   * Get duration in days
   */
  getDurationInDays(): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((this.props.endDate.getTime() - this.props.startDate.getTime() + 1) / msPerDay);
  }

  /**
   * Check if period contains a specific date
   */
  contains(date: Date): boolean {
    return date >= this.props.startDate && date <= this.props.endDate;
  }

  /**
   * Get period label for display
   */
  getLabel(): string {
    switch (this.props.type) {
      case ReportPeriodType.TODAY:
        return 'Today';
      case ReportPeriodType.YESTERDAY:
        return 'Yesterday';
      case ReportPeriodType.LAST_7_DAYS:
        return 'Last 7 Days';
      case ReportPeriodType.LAST_30_DAYS:
        return 'Last 30 Days';
      case ReportPeriodType.THIS_WEEK:
        return 'This Week';
      case ReportPeriodType.LAST_WEEK:
        return 'Last Week';
      case ReportPeriodType.THIS_MONTH:
        return 'This Month';
      case ReportPeriodType.LAST_MONTH:
        return 'Last Month';
      case ReportPeriodType.THIS_QUARTER:
        return 'This Quarter';
      case ReportPeriodType.LAST_QUARTER:
        return 'Last Quarter';
      case ReportPeriodType.THIS_YEAR:
        return 'This Year';
      case ReportPeriodType.LAST_YEAR:
        return 'Last Year';
      case ReportPeriodType.CUSTOM:
        return `${this.props.startDate.toLocaleDateString()} - ${this.props.endDate.toLocaleDateString()}`;
      default:
        return 'Unknown Period';
    }
  }

  /**
   * Split period into smaller intervals
   */
  splitInto(intervalType: 'day' | 'week' | 'month'): ReportPeriod[] {
    const intervals: ReportPeriod[] = [];
    let current = new Date(this.props.startDate);

    while (current < this.props.endDate) {
      let next: Date;

      switch (intervalType) {
        case 'day':
          next = new Date(current);
          next.setDate(next.getDate() + 1);
          break;
        case 'week':
          next = new Date(current);
          next.setDate(next.getDate() + 7);
          break;
        case 'month':
          next = new Date(current);
          next.setMonth(next.getMonth() + 1);
          break;
      }

      const intervalEnd = next > this.props.endDate ? this.props.endDate : new Date(next.getTime() - 1);

      intervals.push(ReportPeriod.fromDateRange(current, intervalEnd, this.props.timezone));

      current = next;
    }

    return intervals;
  }

  /**
   * Value object equality
   */
  equals(other: ReportPeriod): boolean {
    return (
      this.props.type === other.props.type &&
      this.props.startDate.getTime() === other.props.startDate.getTime() &&
      this.props.endDate.getTime() === other.props.endDate.getTime() &&
      this.props.timezone === other.props.timezone
    );
  }

  /**
   * String representation
   */
  toString(): string {
    return `ReportPeriod(${this.props.type}: ${this.props.startDate.toISOString()} - ${this.props.endDate.toISOString()})`;
  }
}
