/**
 * Report Schedule Value Object
 *
 * Following Instructions standards with DDD principles.
 * Encapsulates scheduling logic for automated report generation.
 *
 * @valueObject ReportSchedule
 * @pattern Domain-Driven Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportFrequency } from './ReportType';

// ==================== ENUMS ====================

export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  DISABLED = 'disabled',
  ERROR = 'error',
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum MonthlyType {
  DAY_OF_MONTH = 'day_of_month', // e.g., 15th of each month
  DAY_OF_WEEK = 'day_of_week', // e.g., 2nd Tuesday of each month
  LAST_DAY = 'last_day', // Last day of month
  LAST_WEEKDAY = 'last_weekday', // Last weekday of month
}

// ==================== INTERFACES ====================

export interface ScheduleConfiguration {
  readonly frequency: ReportFrequency;
  readonly time: string; // HH:mm format
  readonly timezone: string;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly isEnabled: boolean;

  // Frequency-specific configurations
  readonly daily?: {
    readonly skipWeekends: boolean;
  };

  readonly weekly?: {
    readonly daysOfWeek: DayOfWeek[];
  };

  readonly monthly?: {
    readonly type: MonthlyType;
    readonly dayOfMonth?: number; // 1-31
    readonly weekOfMonth?: number; // 1-4, -1 for last
    readonly dayOfWeek?: DayOfWeek;
  };

  readonly quarterly?: {
    readonly monthsOffset: number; // 0, 1, or 2 (which month of quarter)
    readonly dayOfMonth: number;
  };

  readonly yearly?: {
    readonly month: number; // 1-12
    readonly dayOfMonth: number;
  };
}

export interface ScheduleMetadata {
  readonly schedule: ScheduleConfiguration;
  readonly status: ScheduleStatus;
  readonly createdAt: Date;
  readonly lastExecuted?: Date;
  readonly nextExecution: Date;
  readonly executionCount: number;
  readonly failureCount: number;
  readonly lastError?: string;
}

export interface NextExecutionResult {
  readonly nextDate: Date;
  readonly isValid: boolean;
  readonly reason?: string;
}

// ==================== VALUE OBJECT ====================

export class ReportScheduleValue {
  private constructor(
    private readonly _configuration: ScheduleConfiguration,
    private readonly _metadata: ScheduleMetadata
  ) {}

  // ==================== STATIC FACTORY METHODS ====================

  static create(configuration: ScheduleConfiguration): ReportScheduleValue {
    const validatedConfig = this.validateConfiguration(configuration);
    const nextExecution = this.calculateNextExecution(validatedConfig);

    const metadata: ScheduleMetadata = {
      schedule: validatedConfig,
      status: validatedConfig.isEnabled ? ScheduleStatus.ACTIVE : ScheduleStatus.DISABLED,
      createdAt: new Date(),
      nextExecution,
      executionCount: 0,
      failureCount: 0,
    };

    return new ReportScheduleValue(validatedConfig, metadata);
  }

  static fromMetadata(metadata: ScheduleMetadata): ReportScheduleValue {
    return new ReportScheduleValue(metadata.schedule, metadata);
  }

  // ==================== GETTERS ====================

  getConfiguration(): ScheduleConfiguration {
    return { ...this._configuration };
  }

  getMetadata(): ScheduleMetadata {
    return { ...this._metadata };
  }

  getStatus(): ScheduleStatus {
    return this._metadata.status;
  }

  getNextExecution(): Date {
    return new Date(this._metadata.nextExecution);
  }

  getLastExecuted(): Date | null {
    return this._metadata.lastExecuted ? new Date(this._metadata.lastExecuted) : null;
  }

  getExecutionCount(): number {
    return this._metadata.executionCount;
  }

  getFailureCount(): number {
    return this._metadata.failureCount;
  }

  isActive(): boolean {
    return this._metadata.status === ScheduleStatus.ACTIVE;
  }

  isExpired(): boolean {
    const now = new Date();
    return this._configuration.endDate ? now > this._configuration.endDate : false;
  }

  isDue(): boolean {
    if (!this.isActive()) return false;

    const now = new Date();
    return now >= this._metadata.nextExecution;
  }

  // ==================== OPERATIONS ====================

  updateConfiguration(newConfig: Partial<ScheduleConfiguration>): ReportScheduleValue {
    const updatedConfig = { ...this._configuration, ...newConfig };
    const validatedConfig = ReportScheduleValue.validateConfiguration(updatedConfig);
    const nextExecution = ReportScheduleValue.calculateNextExecution(validatedConfig);

    const updatedMetadata: ScheduleMetadata = {
      ...this._metadata,
      schedule: validatedConfig,
      nextExecution,
      status: validatedConfig.isEnabled ? ScheduleStatus.ACTIVE : ScheduleStatus.DISABLED,
    };

    return new ReportScheduleValue(validatedConfig, updatedMetadata);
  }

  recordExecution(success: boolean, error?: string): ReportScheduleValue {
    const now = new Date();
    const nextExecution = ReportScheduleValue.calculateNextExecution(this._configuration, now);

    const updatedMetadata: ScheduleMetadata = {
      ...this._metadata,
      lastExecuted: now,
      nextExecution,
      executionCount: this._metadata.executionCount + 1,
      failureCount: success ? this._metadata.failureCount : this._metadata.failureCount + 1,
      ...(error && { lastError: error }),
      status: this.determineStatusAfterExecution(success, error),
    };

    return new ReportScheduleValue(this._configuration, updatedMetadata);
  }

  pause(): ReportScheduleValue {
    const updatedMetadata: ScheduleMetadata = {
      ...this._metadata,
      status: ScheduleStatus.PAUSED,
    };

    return new ReportScheduleValue(this._configuration, updatedMetadata);
  }

  resume(): ReportScheduleValue {
    const nextExecution = ReportScheduleValue.calculateNextExecution(this._configuration);

    const updatedMetadata: ScheduleMetadata = {
      ...this._metadata,
      status: ScheduleStatus.ACTIVE,
      nextExecution,
    };

    return new ReportScheduleValue(this._configuration, updatedMetadata);
  }

  disable(): ReportScheduleValue {
    const updatedMetadata: ScheduleMetadata = {
      ...this._metadata,
      status: ScheduleStatus.DISABLED,
    };

    return new ReportScheduleValue(this._configuration, updatedMetadata);
  }

  // ==================== PRIVATE HELPERS ====================

  private determineStatusAfterExecution(success: boolean, error?: string): ScheduleStatus {
    if (!success && error) {
      // If we have too many consecutive failures, mark as error
      if (this._metadata.failureCount >= 5) {
        return ScheduleStatus.ERROR;
      }
    }

    if (this.isExpired()) {
      return ScheduleStatus.EXPIRED;
    }

    return this._metadata.status;
  }

  // ==================== STATIC VALIDATION ====================

  private static validateConfiguration(config: ScheduleConfiguration): ScheduleConfiguration {
    const errors: string[] = [];

    // Basic validations
    if (!config.frequency) {
      errors.push('Frequency is required');
    }

    if (!config.time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(config.time)) {
      errors.push('Time must be in HH:mm format');
    }

    if (!config.timezone) {
      errors.push('Timezone is required');
    }

    if (!config.startDate) {
      errors.push('Start date is required');
    }

    if (config.endDate && config.startDate && config.endDate <= config.startDate) {
      errors.push('End date must be after start date');
    }

    // Frequency-specific validations
    switch (config.frequency) {
      case ReportFrequency.WEEKLY:
        if (!config.weekly?.daysOfWeek?.length) {
          errors.push('Weekly schedule must specify at least one day of week');
        }
        break;

      case ReportFrequency.MONTHLY:
        if (!config.monthly) {
          errors.push('Monthly schedule configuration is required');
        } else {
          this.validateMonthlyConfig(config.monthly, errors);
        }
        break;

      case ReportFrequency.QUARTERLY:
        if (!config.quarterly) {
          errors.push('Quarterly schedule configuration is required');
        } else {
          this.validateQuarterlyConfig(config.quarterly, errors);
        }
        break;

      case ReportFrequency.YEARLY:
        if (!config.yearly) {
          errors.push('Yearly schedule configuration is required');
        } else {
          this.validateYearlyConfig(config.yearly, errors);
        }
        break;
    }

    if (errors.length > 0) {
      throw new Error(`Invalid schedule configuration: ${errors.join(', ')}`);
    }

    return config;
  }

  private static validateMonthlyConfig(config: ScheduleConfiguration['monthly'], errors: string[]): void {
    if (!config) return;

    switch (config.type) {
      case MonthlyType.DAY_OF_MONTH:
        if (!config.dayOfMonth || config.dayOfMonth < 1 || config.dayOfMonth > 31) {
          errors.push('Day of month must be between 1 and 31');
        }
        break;

      case MonthlyType.DAY_OF_WEEK:
        if (
          config.weekOfMonth === undefined ||
          config.weekOfMonth < -1 ||
          config.weekOfMonth > 4 ||
          config.weekOfMonth === 0
        ) {
          errors.push('Week of month must be 1-4 or -1 for last week');
        }
        if (config.dayOfWeek === undefined || config.dayOfWeek < 0 || config.dayOfWeek > 6) {
          errors.push('Day of week must be 0-6');
        }
        break;
    }
  }

  private static validateQuarterlyConfig(config: ScheduleConfiguration['quarterly'], errors: string[]): void {
    if (!config) return;

    if (config.monthsOffset < 0 || config.monthsOffset > 2) {
      errors.push('Quarterly months offset must be 0, 1, or 2');
    }

    if (config.dayOfMonth < 1 || config.dayOfMonth > 31) {
      errors.push('Day of month must be between 1 and 31');
    }
  }

  private static validateYearlyConfig(config: ScheduleConfiguration['yearly'], errors: string[]): void {
    if (!config) return;

    if (config.month < 1 || config.month > 12) {
      errors.push('Month must be between 1 and 12');
    }

    if (config.dayOfMonth < 1 || config.dayOfMonth > 31) {
      errors.push('Day of month must be between 1 and 31');
    }
  }

  // ==================== STATIC CALCULATION METHODS ====================

  static calculateNextExecution(config: ScheduleConfiguration, from: Date = new Date()): Date {
    const [hours, minutes] = config.time.split(':').map(Number);

    switch (config.frequency) {
      case ReportFrequency.DAILY:
        return this.calculateNextDaily(config, from, hours, minutes);

      case ReportFrequency.WEEKLY:
        return this.calculateNextWeekly(config, from, hours, minutes);

      case ReportFrequency.MONTHLY:
        return this.calculateNextMonthly(config, from, hours, minutes);

      case ReportFrequency.QUARTERLY:
        return this.calculateNextQuarterly(config, from, hours, minutes);

      case ReportFrequency.YEARLY:
        return this.calculateNextYearly(config, from, hours, minutes);

      default:
        throw new Error(`Unsupported frequency: ${config.frequency}`);
    }
  }

  private static calculateNextDaily(config: ScheduleConfiguration, from: Date, hours: number, minutes: number): Date {
    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);

    // If the time has passed today, move to tomorrow
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }

    // Skip weekends if configured
    if (config.daily?.skipWeekends) {
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  }

  private static calculateNextWeekly(config: ScheduleConfiguration, from: Date, hours: number, minutes: number): Date {
    if (!config.weekly?.daysOfWeek?.length) {
      throw new Error('Weekly schedule must specify days of week');
    }

    const daysOfWeek = [...config.weekly.daysOfWeek].sort();
    const currentDay = from.getDay();

    // Find the next occurrence
    let targetDay = daysOfWeek.find((day) => {
      if (day > currentDay) return true;
      if (day === currentDay) {
        const todayAtTime = new Date(from);
        todayAtTime.setHours(hours, minutes, 0, 0);
        return todayAtTime > from;
      }
      return false;
    });

    // If no day found this week, use the first day of next week
    if (targetDay === undefined) {
      targetDay = daysOfWeek[0];
    }

    const next = new Date(from);
    const daysToAdd =
      targetDay === daysOfWeek[0] && targetDay <= currentDay ? 7 - currentDay + targetDay : targetDay - currentDay;

    next.setDate(next.getDate() + daysToAdd);
    next.setHours(hours, minutes, 0, 0);

    return next;
  }

  private static calculateNextMonthly(config: ScheduleConfiguration, from: Date, hours: number, minutes: number): Date {
    if (!config.monthly) {
      throw new Error('Monthly configuration is required');
    }

    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);

    switch (config.monthly.type) {
      case MonthlyType.DAY_OF_MONTH:
        return this.calculateNextMonthlyByDay(next, config.monthly.dayOfMonth!, from);

      case MonthlyType.DAY_OF_WEEK:
        return this.calculateNextMonthlyByWeekday(next, config.monthly, from);

      case MonthlyType.LAST_DAY:
        return this.calculateNextMonthlyLastDay(next, from);

      case MonthlyType.LAST_WEEKDAY:
        return this.calculateNextMonthlyLastWeekday(next, from);

      default:
        throw new Error(`Unsupported monthly type: ${config.monthly.type}`);
    }
  }

  private static calculateNextMonthlyByDay(next: Date, dayOfMonth: number, from: Date): Date {
    next.setDate(dayOfMonth);

    // If the date has passed this month, move to next month
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dayOfMonth);
    }

    return next;
  }

  private static calculateNextMonthlyByWeekday(
    next: Date,
    config: NonNullable<ScheduleConfiguration['monthly']>,
    from: Date
  ): Date {
    const { weekOfMonth, dayOfWeek } = config;
    if (weekOfMonth === undefined || dayOfWeek === undefined) {
      throw new Error('Week of month and day of week are required for DAY_OF_WEEK monthly type');
    }

    // Implementation for nth weekday of month (e.g., 2nd Tuesday)
    // This is a simplified version - full implementation would handle edge cases
    next.setDate(1);

    while (next.getDay() !== dayOfWeek) {
      next.setDate(next.getDate() + 1);
    }

    if (weekOfMonth > 0) {
      next.setDate(next.getDate() + (weekOfMonth - 1) * 7);
    } else {
      // Last occurrence of the weekday in the month
      while (next.getDate() + 7 <= new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()) {
        next.setDate(next.getDate() + 7);
      }
    }

    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      // Recalculate for next month
      return this.calculateNextMonthlyByWeekday(next, config, from);
    }

    return next;
  }

  private static calculateNextMonthlyLastDay(next: Date, from: Date): Date {
    // Set to last day of current month
    next.setMonth(next.getMonth() + 1, 0);

    if (next <= from) {
      next.setMonth(next.getMonth() + 2, 0);
    }

    return next;
  }

  private static calculateNextMonthlyLastWeekday(next: Date, from: Date): Date {
    // Set to last day of current month
    next.setMonth(next.getMonth() + 1, 0);

    // Move back to last weekday (Mon-Fri)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() - 1);
    }

    if (next <= from) {
      next.setMonth(next.getMonth() + 2, 0);
      return this.calculateNextMonthlyLastWeekday(next, from);
    }

    return next;
  }

  private static calculateNextQuarterly(
    config: ScheduleConfiguration,
    from: Date,
    hours: number,
    minutes: number
  ): Date {
    if (!config.quarterly) {
      throw new Error('Quarterly configuration is required');
    }

    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);

    // Find current quarter and calculate next occurrence
    const currentQuarter = Math.floor(next.getMonth() / 3);
    const quarterStartMonth = currentQuarter * 3 + config.quarterly.monthsOffset;

    next.setMonth(quarterStartMonth, config.quarterly.dayOfMonth);

    if (next <= from) {
      // Move to next quarter
      next.setMonth(quarterStartMonth + 3, config.quarterly.dayOfMonth);
    }

    return next;
  }

  private static calculateNextYearly(config: ScheduleConfiguration, from: Date, hours: number, minutes: number): Date {
    if (!config.yearly) {
      throw new Error('Yearly configuration is required');
    }

    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);
    next.setMonth(config.yearly.month - 1, config.yearly.dayOfMonth);

    if (next <= from) {
      next.setFullYear(next.getFullYear() + 1);
    }

    return next;
  }
}

// ==================== UTILITY FUNCTIONS ====================

export const ReportScheduleUtils = {
  /**
   * Get human-readable schedule description
   */
  getScheduleDescription(schedule: ReportScheduleValue): string {
    const config = schedule.getConfiguration();

    switch (config.frequency) {
      case ReportFrequency.DAILY:
        return config.daily?.skipWeekends ? 'Daily (weekdays only)' : 'Daily';

      case ReportFrequency.WEEKLY:
        const days = config.weekly?.daysOfWeek?.map((day) => this.getDayName(day)).join(', ') || '';
        return `Weekly on ${days}`;

      case ReportFrequency.MONTHLY:
        return this.getMonthlyDescription(config.monthly);

      case ReportFrequency.QUARTERLY:
        return `Quarterly`;

      case ReportFrequency.YEARLY:
        return `Yearly`;

      default:
        return 'Unknown frequency';
    }
  },

  /**
   * Get status color for UI
   */
  getStatusColor(status: ScheduleStatus): string {
    const colors = {
      [ScheduleStatus.ACTIVE]: 'green',
      [ScheduleStatus.PAUSED]: 'yellow',
      [ScheduleStatus.EXPIRED]: 'gray',
      [ScheduleStatus.DISABLED]: 'gray',
      [ScheduleStatus.ERROR]: 'red',
    };

    return colors[status] || 'gray';
  },

  /**
   * Get status icon for UI
   */
  getStatusIcon(status: ScheduleStatus): string {
    const icons = {
      [ScheduleStatus.ACTIVE]: '▶️',
      [ScheduleStatus.PAUSED]: '⏸️',
      [ScheduleStatus.EXPIRED]: '⏰',
      [ScheduleStatus.DISABLED]: '⏹️',
      [ScheduleStatus.ERROR]: '❌',
    };

    return icons[status] || '❓';
  },

  /**
   * Private helper methods
   */
  getDayName(day: DayOfWeek): string {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[day];
  },

  getMonthlyDescription(config: ScheduleConfiguration['monthly']): string {
    if (!config) return 'Monthly';

    switch (config.type) {
      case MonthlyType.DAY_OF_MONTH:
        return `Monthly on day ${config.dayOfMonth}`;

      case MonthlyType.DAY_OF_WEEK:
        const weekDesc =
          config.weekOfMonth === -1 ? 'last' : `${config.weekOfMonth}${this.getOrdinalSuffix(config.weekOfMonth!)}`;
        const dayName = config.dayOfWeek !== undefined ? this.getDayName(config.dayOfWeek) : '';
        return `Monthly on ${weekDesc} ${dayName}`;

      case MonthlyType.LAST_DAY:
        return 'Monthly on last day';

      case MonthlyType.LAST_WEEKDAY:
        return 'Monthly on last weekday';

      default:
        return 'Monthly';
    }
  },

  getOrdinalSuffix(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  },
} as const;

// ==================== EXPORTS ====================

export default ReportScheduleValue;
