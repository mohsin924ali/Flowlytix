/**
 * Scheduled Report Entity
 *
 * Following Instructions standards with DDD principles.
 * Represents a scheduled report configuration that can be automatically executed.
 *
 * @entity ScheduledReport
 * @pattern Domain-Driven Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportExecutionRequest, ReportExecutionResult } from '../types/ReportTypes';
import { ReportType } from '../valueObjects/ReportType';
import { ReportFormat } from '../valueObjects/ReportFormat';
import {
  ReportScheduleValue,
  ScheduleConfiguration,
  ScheduleStatus,
  ReportScheduleUtils,
} from '../valueObjects/ReportSchedule';

// ==================== INTERFACES ====================

export interface ScheduledReportId {
  readonly value: string;
}

export interface CreateScheduledReportData {
  readonly name: string;
  readonly description?: string;
  readonly reportRequest: ReportExecutionRequest;
  readonly schedule: ScheduleConfiguration;
  readonly recipients: string[];
  readonly tags?: string[];
  readonly isEnabled?: boolean;
}

export interface ScheduledReportMetadata {
  readonly id: ScheduledReportId;
  readonly name: string;
  readonly description?: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
  readonly recipients: string[];
  readonly tags: string[];
  readonly isEnabled: boolean;
}

export interface ExecutionHistory {
  readonly executionId: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly status: 'running' | 'completed' | 'failed' | 'cancelled';
  readonly result?: ReportExecutionResult;
  readonly error?: string;
  readonly duration?: number; // in milliseconds
  readonly fileSize?: number; // in bytes
}

// ==================== ENTITY ====================

export class ScheduledReport {
  private constructor(
    private readonly _metadata: ScheduledReportMetadata,
    private _reportRequest: ReportExecutionRequest,
    private _schedule: ReportScheduleValue,
    private readonly _executionHistory: ExecutionHistory[]
  ) {}

  // ==================== STATIC FACTORY METHODS ====================

  static create(data: CreateScheduledReportData): ScheduledReport {
    const id: ScheduledReportId = { value: this.generateId() };

    const metadata: ScheduledReportMetadata = {
      id,
      name: data.name,
      ...(data.description && { description: data.description }),
      createdBy: data.reportRequest.context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      recipients: [...data.recipients],
      tags: data.tags ? [...data.tags] : [],
      isEnabled: data.isEnabled ?? true,
    };

    const schedule = ReportScheduleValue.create(data.schedule);

    return new ScheduledReport(metadata, data.reportRequest, schedule, []);
  }

  static restore(
    metadata: ScheduledReportMetadata,
    reportRequest: ReportExecutionRequest,
    schedule: ReportScheduleValue,
    executionHistory: ExecutionHistory[]
  ): ScheduledReport {
    return new ScheduledReport(metadata, reportRequest, schedule, [...executionHistory]);
  }

  private static generateId(): string {
    return `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== GETTERS ====================

  getId(): ScheduledReportId {
    return { ...this._metadata.id };
  }

  getName(): string {
    return this._metadata.name;
  }

  getDescription(): string | undefined {
    return this._metadata.description;
  }

  getMetadata(): ScheduledReportMetadata {
    return { ...this._metadata };
  }

  getReportRequest(): ReportExecutionRequest {
    return { ...this._reportRequest };
  }

  getSchedule(): ReportScheduleValue {
    return this._schedule;
  }

  getExecutionHistory(): ExecutionHistory[] {
    return [...this._executionHistory];
  }

  getLastExecution(): ExecutionHistory | null {
    return this._executionHistory.length > 0 ? { ...this._executionHistory[this._executionHistory.length - 1] } : null;
  }

  getSuccessfulExecutions(): ExecutionHistory[] {
    return this._executionHistory.filter((exec) => exec.status === 'completed');
  }

  getFailedExecutions(): ExecutionHistory[] {
    return this._executionHistory.filter((exec) => exec.status === 'failed');
  }

  getRecentExecutions(count: number = 10): ExecutionHistory[] {
    return this._executionHistory
      .slice(-count)
      .reverse()
      .map((exec) => ({ ...exec }));
  }

  // ==================== STATUS CHECKS ====================

  isEnabled(): boolean {
    return this._metadata.isEnabled;
  }

  isActive(): boolean {
    return this.isEnabled() && this._schedule.isActive();
  }

  isDue(): boolean {
    return this.isActive() && this._schedule.isDue();
  }

  canExecute(): boolean {
    return this.isActive() && !this.isCurrentlyRunning();
  }

  isCurrentlyRunning(): boolean {
    const lastExecution = this.getLastExecution();
    return lastExecution?.status === 'running';
  }

  getNextExecutionTime(): Date {
    return this._schedule.getNextExecution();
  }

  getScheduleStatus(): ScheduleStatus {
    return this._schedule.getStatus();
  }

  // ==================== OPERATIONS ====================

  updateMetadata(
    updates: Partial<Pick<ScheduledReportMetadata, 'name' | 'description' | 'recipients' | 'tags'>>
  ): ScheduledReport {
    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      ...updates,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    return new ScheduledReport(updatedMetadata, this._reportRequest, this._schedule, this._executionHistory);
  }

  updateReportRequest(newRequest: ReportExecutionRequest): ScheduledReport {
    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    return new ScheduledReport(updatedMetadata, newRequest, this._schedule, this._executionHistory);
  }

  updateSchedule(newScheduleConfig: Partial<ScheduleConfiguration>): ScheduledReport {
    const updatedSchedule = this._schedule.updateConfiguration(newScheduleConfig);

    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    return new ScheduledReport(updatedMetadata, this._reportRequest, updatedSchedule, this._executionHistory);
  }

  enable(): ScheduledReport {
    if (this.isEnabled()) return this;

    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      isEnabled: true,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    const resumedSchedule = this._schedule.resume();

    return new ScheduledReport(updatedMetadata, this._reportRequest, resumedSchedule, this._executionHistory);
  }

  disable(): ScheduledReport {
    if (!this.isEnabled()) return this;

    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      isEnabled: false,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    const disabledSchedule = this._schedule.disable();

    return new ScheduledReport(updatedMetadata, this._reportRequest, disabledSchedule, this._executionHistory);
  }

  pause(): ScheduledReport {
    const pausedSchedule = this._schedule.pause();

    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    return new ScheduledReport(updatedMetadata, this._reportRequest, pausedSchedule, this._executionHistory);
  }

  resume(): ScheduledReport {
    const resumedSchedule = this._schedule.resume();

    const updatedMetadata: ScheduledReportMetadata = {
      ...this._metadata,
      updatedAt: new Date(),
      version: this._metadata.version + 1,
    };

    return new ScheduledReport(updatedMetadata, this._reportRequest, resumedSchedule, this._executionHistory);
  }

  // ==================== EXECUTION TRACKING ====================

  startExecution(executionId: string): ScheduledReport {
    const newExecution: ExecutionHistory = {
      executionId,
      startedAt: new Date(),
      status: 'running',
    };

    const updatedHistory = [...this._executionHistory, newExecution];

    return new ScheduledReport(this._metadata, this._reportRequest, this._schedule, updatedHistory);
  }

  completeExecution(executionId: string, result: ReportExecutionResult, fileSize?: number): ScheduledReport {
    const updatedHistory = this._executionHistory.map((exec) => {
      if (exec.executionId === executionId && exec.status === 'running') {
        const completedAt = new Date();
        return {
          ...exec,
          completedAt,
          status: 'completed' as const,
          result,
          fileSize,
          duration: completedAt.getTime() - exec.startedAt.getTime(),
        };
      }
      return exec;
    });

    const updatedSchedule = this._schedule.recordExecution(true);

    return new ScheduledReport(this._metadata, this._reportRequest, updatedSchedule, updatedHistory);
  }

  failExecution(executionId: string, error: string): ScheduledReport {
    const updatedHistory = this._executionHistory.map((exec) => {
      if (exec.executionId === executionId && exec.status === 'running') {
        const completedAt = new Date();
        return {
          ...exec,
          completedAt,
          status: 'failed' as const,
          error,
          duration: completedAt.getTime() - exec.startedAt.getTime(),
        };
      }
      return exec;
    });

    const updatedSchedule = this._schedule.recordExecution(false, error);

    return new ScheduledReport(this._metadata, this._reportRequest, updatedSchedule, updatedHistory);
  }

  cancelExecution(executionId: string, reason: string): ScheduledReport {
    const updatedHistory = this._executionHistory.map((exec) => {
      if (exec.executionId === executionId && exec.status === 'running') {
        const completedAt = new Date();
        return {
          ...exec,
          completedAt,
          status: 'cancelled' as const,
          error: reason,
          duration: completedAt.getTime() - exec.startedAt.getTime(),
        };
      }
      return exec;
    });

    return new ScheduledReport(this._metadata, this._reportRequest, this._schedule, updatedHistory);
  }

  // ==================== ANALYTICS ====================

  getExecutionStats(): {
    total: number;
    successful: number;
    failed: number;
    cancelled: number;
    running: number;
    successRate: number;
    averageDuration: number;
    averageFileSize: number;
  } {
    const total = this._executionHistory.length;
    const successful = this.getSuccessfulExecutions().length;
    const failed = this.getFailedExecutions().length;
    const cancelled = this._executionHistory.filter((exec) => exec.status === 'cancelled').length;
    const running = this._executionHistory.filter((exec) => exec.status === 'running').length;

    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const completedExecutions = this._executionHistory.filter((exec) => exec.duration !== undefined);
    const averageDuration =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0) / completedExecutions.length
        : 0;

    const executionsWithFileSize = this._executionHistory.filter((exec) => exec.fileSize !== undefined);
    const averageFileSize =
      executionsWithFileSize.length > 0
        ? executionsWithFileSize.reduce((sum, exec) => sum + (exec.fileSize || 0), 0) / executionsWithFileSize.length
        : 0;

    return {
      total,
      successful,
      failed,
      cancelled,
      running,
      successRate,
      averageDuration,
      averageFileSize,
    };
  }

  getScheduleDescription(): string {
    return ReportScheduleUtils.getScheduleDescription(this._schedule);
  }

  // ==================== VALIDATION ====================

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this._metadata.name.trim()) {
      errors.push('Name is required');
    }

    if (this._metadata.recipients.length === 0) {
      errors.push('At least one recipient is required');
    }

    if (!this._reportRequest.reportType) {
      errors.push('Report type is required');
    }

    if (!this._reportRequest.format) {
      errors.push('Report format is required');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = this._metadata.recipients.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ==================== SERIALIZATION ====================

  toJSON(): {
    metadata: ScheduledReportMetadata;
    reportRequest: ReportExecutionRequest;
    schedule: ReturnType<ReportScheduleValue['getMetadata']>;
    executionHistory: ExecutionHistory[];
    stats: ReturnType<ScheduledReport['getExecutionStats']>;
  } {
    return {
      metadata: this.getMetadata(),
      reportRequest: this.getReportRequest(),
      schedule: this._schedule.getMetadata(),
      executionHistory: this.getExecutionHistory(),
      stats: this.getExecutionStats(),
    };
  }
}

// ==================== FACTORY ====================

export class ScheduledReportFactory {
  static createFromTemplate(
    name: string,
    reportType: ReportType,
    format: ReportFormat,
    scheduleConfig: ScheduleConfiguration,
    recipients: string[],
    userId: string,
    agencyId: string
  ): ScheduledReport {
    const reportRequest: ReportExecutionRequest = {
      reportType,
      format,
      parameters: {
        // Default parameters - can be customized later
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      context: {
        userId,
        agencyId,
        timestamp: new Date(),
        userRole: 'user',
        permissions: ['REPORT_GENERATE'],
      },
    };

    return ScheduledReport.create({
      name,
      description: `Scheduled ${reportType} report in ${format} format`,
      reportRequest,
      schedule: scheduleConfig,
      recipients,
      tags: ['automated', reportType.toLowerCase(), format.toLowerCase()],
    });
  }
}

// ==================== UTILS ====================

export const ScheduledReportUtils = {
  /**
   * Sort scheduled reports by next execution time
   */
  sortByNextExecution(reports: ScheduledReport[]): ScheduledReport[] {
    return [...reports].sort((a, b) => {
      const aNext = a.getNextExecutionTime().getTime();
      const bNext = b.getNextExecutionTime().getTime();
      return aNext - bNext;
    });
  },

  /**
   * Filter reports that are due for execution
   */
  filterDueReports(reports: ScheduledReport[]): ScheduledReport[] {
    return reports.filter((report) => report.isDue());
  },

  /**
   * Filter reports by status
   */
  filterByStatus(reports: ScheduledReport[], status: ScheduleStatus): ScheduledReport[] {
    return reports.filter((report) => report.getScheduleStatus() === status);
  },

  /**
   * Filter reports by report type
   */
  filterByReportType(reports: ScheduledReport[], reportType: ReportType): ScheduledReport[] {
    return reports.filter((report) => report.getReportRequest().reportType === reportType);
  },

  /**
   * Filter reports by tags
   */
  filterByTags(reports: ScheduledReport[], tags: string[]): ScheduledReport[] {
    return reports.filter((report) => {
      const reportTags = report.getMetadata().tags;
      return tags.some((tag) => reportTags.includes(tag));
    });
  },

  /**
   * Get execution summary for multiple reports
   */
  getAggregatedStats(reports: ScheduledReport[]): {
    totalReports: number;
    activeReports: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    overallSuccessRate: number;
  } {
    const totalReports = reports.length;
    const activeReports = reports.filter((r) => r.isActive()).length;

    const allStats = reports.map((r) => r.getExecutionStats());
    const totalExecutions = allStats.reduce((sum, stats) => sum + stats.total, 0);
    const successfulExecutions = allStats.reduce((sum, stats) => sum + stats.successful, 0);
    const failedExecutions = allStats.reduce((sum, stats) => sum + stats.failed, 0);

    const overallSuccessRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      totalReports,
      activeReports,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      overallSuccessRate,
    };
  },
} as const;

// ==================== EXPORTS ====================

export default ScheduledReport;
