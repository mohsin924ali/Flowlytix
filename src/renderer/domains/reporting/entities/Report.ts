/**
 * Report Entity
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Core report entity with business logic and state management.
 *
 * @domain Reporting
 * @pattern Entity
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportType } from '../valueObjects/ReportType';
import { ReportStatus, ReportStatusValue } from '../valueObjects/ReportStatus';
import { ReportFormat, ReportFormatValue } from '../valueObjects/ReportFormat';
import type {
  ReportExecutionRequest,
  ReportExecutionResult,
  ReportExecutionContext,
  ReportData,
  ReportErrorCode,
} from '../types/ReportTypes';
import { ReportBusinessRules, ReportErrorCodes } from '../types/ReportTypes';

/**
 * Report entity identifier
 */
export type ReportId = string;

/**
 * Report creation data interface
 */
export interface CreateReportData {
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly parameters: Record<string, unknown>;
  readonly filters?: Record<string, unknown> | undefined;
  readonly options?: Record<string, unknown> | undefined;
  readonly context: ReportExecutionContext;
}

/**
 * Report metadata interface
 */
export interface ReportMetadata {
  readonly executionTime?: number | undefined; // in milliseconds
  readonly recordCount?: number | undefined;
  readonly fileSize?: number | undefined; // in bytes
  readonly generatedAt?: Date | undefined;
  readonly expiresAt?: Date | undefined;
  readonly version: string;
  readonly source: string;
}

/**
 * Report error information
 */
export interface ReportError {
  readonly code: ReportErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown> | undefined;
  readonly timestamp: Date;
  readonly recoverable: boolean;
}

/**
 * Report progress information
 */
export interface ReportProgress {
  readonly percentage: number;
  readonly stage: string;
  readonly message: string;
  readonly estimatedTimeRemaining?: number; // in milliseconds
  readonly timestamp: Date;
}

/**
 * Report Entity Class
 * Core domain entity representing a report execution instance
 */
export class Report {
  private constructor(
    private readonly _id: ReportId,
    private readonly _reportType: ReportType,
    private readonly _format: ReportFormat,
    private readonly _parameters: Record<string, unknown>,
    private readonly _filters: Record<string, unknown>,
    private readonly _options: Record<string, unknown>,
    private readonly _context: ReportExecutionContext,
    private _status: ReportStatusValue,
    private _data: ReportData | null,
    private _url: string | null,
    private _metadata: ReportMetadata,
    private _error: ReportError | null,
    private _progress: ReportProgress | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  /**
   * Create new report entity
   */
  static create(data: CreateReportData): Report {
    const now = new Date();
    const reportId = Report.generateId();

    // Validate report type and format compatibility
    Report.validateTypeFormatCompatibility(data.reportType, data.format);

    // Validate parameters
    Report.validateParameters(data.reportType, data.parameters);

    // Validate context
    Report.validateExecutionContext(data.context);

    const initialMetadata: ReportMetadata = {
      version: '1.0.0',
      source: 'Flowlytix Report Engine',
    };

    return new Report(
      reportId,
      data.reportType,
      data.format,
      data.parameters,
      data.filters || {},
      data.options || {},
      data.context,
      ReportStatusValue.from(ReportStatus.PENDING),
      null,
      null,
      initialMetadata,
      null,
      null,
      now,
      now
    );
  }

  /**
   * Restore report from persistence
   */
  static restore(result: ReportExecutionResult): Report {
    const status = ReportStatusValue.from(result.status);
    const format = ReportFormatValue.from(result.format);

    const metadata: ReportMetadata = {
      executionTime: result.metadata.executionTime,
      recordCount: result.metadata.recordCount,
      fileSize: result.metadata.fileSize,
      generatedAt: result.metadata.generatedAt,
      expiresAt: result.metadata.expiresAt,
      version: '1.0.0',
      source: 'Flowlytix Report Engine',
    };

    const error = result.error
      ? {
          code: result.error.code as ReportErrorCode,
          message: result.error.message,
          details: result.error.details,
          timestamp: new Date(),
          recoverable: Report.isRecoverableError(result.error.code as ReportErrorCode),
        }
      : null;

    const progress = result.progress
      ? {
          percentage: result.progress.percentage,
          stage: result.progress.stage,
          message: result.progress.message,
          timestamp: new Date(),
        }
      : null;

    // Extract context from result (this would typically come from the persistence layer)
    const context: ReportExecutionContext = {
      agencyId: 'default-agency', // This should be populated from the persistence layer
      userId: 'default-user',
      userRole: 'user',
      permissions: [],
      timestamp: result.metadata.generatedAt,
    };

    return new Report(
      result.id,
      result.reportType,
      result.format,
      {}, // Parameters would be restored from persistence
      {},
      {},
      context,
      status,
      result.data as ReportData | null,
      result.url || null,
      metadata,
      error,
      progress,
      result.metadata.generatedAt,
      new Date()
    );
  }

  /**
   * Get report ID
   */
  getId(): ReportId {
    return this._id;
  }

  /**
   * Get report type
   */
  getReportType(): ReportType {
    return this._reportType;
  }

  /**
   * Get report format
   */
  getFormat(): ReportFormat {
    return this._format;
  }

  /**
   * Get report parameters
   */
  getParameters(): Record<string, unknown> {
    return { ...this._parameters };
  }

  /**
   * Get report filters
   */
  getFilters(): Record<string, unknown> {
    return { ...this._filters };
  }

  /**
   * Get report options
   */
  getOptions(): Record<string, unknown> {
    return { ...this._options };
  }

  /**
   * Get execution context
   */
  getContext(): ReportExecutionContext {
    return { ...this._context };
  }

  /**
   * Get current status
   */
  getStatus(): ReportStatusValue {
    return this._status;
  }

  /**
   * Get report data
   */
  getData(): ReportData | null {
    return this._data;
  }

  /**
   * Get download URL
   */
  getUrl(): string | null {
    return this._url;
  }

  /**
   * Get metadata
   */
  getMetadata(): ReportMetadata {
    return { ...this._metadata };
  }

  /**
   * Get error information
   */
  getError(): ReportError | null {
    return this._error ? { ...this._error } : null;
  }

  /**
   * Get progress information
   */
  getProgress(): ReportProgress | null {
    return this._progress ? { ...this._progress } : null;
  }

  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * Get last update timestamp
   */
  getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  /**
   * Start report execution
   */
  start(): void {
    this.validateStatusTransition(ReportStatus.RUNNING);
    this._status = ReportStatusValue.from(ReportStatus.RUNNING);
    this._progress = {
      percentage: 0,
      stage: 'Starting',
      message: 'Initializing report generation',
      timestamp: new Date(),
    };
    this._updatedAt = new Date();
  }

  /**
   * Update execution progress
   */
  updateProgress(percentage: number, stage: string, message: string): void {
    if (!this._status.isInProgress()) {
      throw new Error('Cannot update progress for non-running report');
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Progress percentage must be between 0 and 100');
    }

    this._progress = {
      percentage,
      stage,
      message,
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(percentage),
      timestamp: new Date(),
    };
    this._updatedAt = new Date();
  }

  /**
   * Complete report execution successfully
   */
  complete(data: ReportData, url?: string): void {
    this.validateStatusTransition(ReportStatus.COMPLETED);

    const now = new Date();
    const executionTime = now.getTime() - this._createdAt.getTime();

    this._status = ReportStatusValue.from(ReportStatus.COMPLETED);
    this._data = data;
    this._url = url || null;
    this._metadata = {
      ...this._metadata,
      executionTime,
      recordCount: data.metadata.recordCount,
      generatedAt: now,
      expiresAt: this.calculateExpirationDate(now),
    };
    this._progress = {
      percentage: 100,
      stage: 'Completed',
      message: 'Report generated successfully',
      timestamp: now,
    };
    this._error = null;
    this._updatedAt = now;
  }

  /**
   * Fail report execution
   */
  fail(error: ReportError): void {
    this.validateStatusTransition(ReportStatus.FAILED);

    this._status = ReportStatusValue.from(ReportStatus.FAILED);
    this._error = error;
    this._progress = null;
    this._updatedAt = new Date();
  }

  /**
   * Cancel report execution
   */
  cancel(reason?: string): void {
    this.validateStatusTransition(ReportStatus.CANCELLED);

    this._status = ReportStatusValue.from(ReportStatus.CANCELLED);
    this._error = reason
      ? {
          code: ReportErrorCodes.INTERNAL_ERROR,
          message: reason,
          timestamp: new Date(),
          recoverable: true,
        }
      : null;
    this._progress = null;
    this._updatedAt = new Date();
  }

  /**
   * Timeout report execution
   */
  timeout(): void {
    this.validateStatusTransition(ReportStatus.TIMEOUT);

    this._status = ReportStatusValue.from(ReportStatus.TIMEOUT);
    this._error = {
      code: ReportErrorCodes.EXECUTION_TIMEOUT,
      message: `Report execution timed out after ${ReportBusinessRules.MAX_REPORT_EXECUTION_TIME}ms`,
      timestamp: new Date(),
      recoverable: true,
    };
    this._progress = null;
    this._updatedAt = new Date();
  }

  /**
   * Start export process
   */
  startExport(targetFormat: ReportFormat): void {
    if (!this._status.equals(ReportStatusValue.from(ReportStatus.COMPLETED))) {
      throw new Error('Cannot export incomplete report');
    }

    // Validate format compatibility
    const formatValue = ReportFormatValue.from(targetFormat);
    if (!formatValue.canHandleRecordCount(this._metadata.recordCount || 0)) {
      throw new Error(`Target format ${targetFormat} cannot handle ${this._metadata.recordCount} records`);
    }

    this._status = ReportStatusValue.from(ReportStatus.EXPORTING);
    this._progress = {
      percentage: 0,
      stage: 'Exporting',
      message: `Converting to ${formatValue.getDisplayName()}`,
      timestamp: new Date(),
    };
    this._updatedAt = new Date();
  }

  /**
   * Complete export process
   */
  completeExport(url: string, fileSize: number): void {
    this.validateStatusTransition(ReportStatus.EXPORTED);

    this._status = ReportStatusValue.from(ReportStatus.EXPORTED);
    this._url = url;
    this._metadata = {
      ...this._metadata,
      fileSize: fileSize,
    };
    this._progress = {
      percentage: 100,
      stage: 'Exported',
      message: 'Export completed successfully',
      timestamp: new Date(),
    };
    this._updatedAt = new Date();
  }

  /**
   * Check if report can be retried
   */
  canRetry(): boolean {
    return this._status.canRetry();
  }

  /**
   * Check if report is expired
   */
  isExpired(): boolean {
    if (!this._metadata.expiresAt) {
      return false;
    }
    return new Date() > this._metadata.expiresAt;
  }

  /**
   * Check if report execution is complete
   */
  isComplete(): boolean {
    return this._status.isSuccess();
  }

  /**
   * Check if report has errors
   */
  hasError(): boolean {
    return this._status.isError() || this._error !== null;
  }

  /**
   * Check if report is in progress
   */
  isInProgress(): boolean {
    return this._status.isInProgress();
  }

  /**
   * Get execution duration in milliseconds
   */
  getExecutionDuration(): number {
    if (this._metadata.executionTime) {
      return this._metadata.executionTime;
    }
    return new Date().getTime() - this._createdAt.getTime();
  }

  /**
   * Convert to execution result for external consumption
   */
  toExecutionResult(): ReportExecutionResult {
    return {
      id: this._id,
      reportType: this._reportType,
      format: this._format,
      status: this._status.toString() as ReportStatus,
      data: this._data,
      url: this._url,
      metadata: {
        executionTime: this._metadata.executionTime || this.getExecutionDuration(),
        recordCount: this._metadata.recordCount || 0,
        fileSize: this._metadata.fileSize,
        generatedAt: this._metadata.generatedAt || this._createdAt,
        expiresAt: this._metadata.expiresAt,
      },
      error: this._error
        ? {
            code: this._error.code,
            message: this._error.message,
            details: this._error.details,
          }
        : undefined,
      progress: this._progress
        ? {
            percentage: this._progress.percentage,
            stage: this._progress.stage,
            message: this._progress.message,
          }
        : undefined,
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Generate unique report ID
   */
  private static generateId(): ReportId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `rpt_${timestamp}_${random}`;
  }

  /**
   * Validate type and format compatibility
   */
  private static validateTypeFormatCompatibility(reportType: ReportType, format: ReportFormat): void {
    const formatValue = ReportFormatValue.from(format);
    // Add business rules for format compatibility per report type
    // This could be moved to a separate business rules service
  }

  /**
   * Validate report parameters
   */
  private static validateParameters(reportType: ReportType, parameters: Record<string, unknown>): void {
    // This would validate parameters against the report template
    // Implementation would depend on the template engine
  }

  /**
   * Validate execution context
   */
  private static validateExecutionContext(context: ReportExecutionContext): void {
    if (!context.agencyId || !context.userId) {
      throw new Error('Agency ID and User ID are required');
    }

    if (!context.permissions || context.permissions.length === 0) {
      throw new Error('User permissions are required');
    }
  }

  /**
   * Check if error is recoverable
   */
  private static isRecoverableError(errorCode: ReportErrorCode): boolean {
    const recoverableErrors = [
      ReportErrorCodes.EXECUTION_TIMEOUT,
      ReportErrorCodes.DATA_SOURCE_UNAVAILABLE,
      ReportErrorCodes.SERVICE_UNAVAILABLE,
      ReportErrorCodes.CONCURRENT_LIMIT_EXCEEDED,
    ];
    return recoverableErrors.includes(errorCode);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(newStatus: ReportStatus): void {
    try {
      this._status.validateTransition(newStatus);
    } catch (error) {
      throw new Error(`Invalid status transition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate estimated time remaining based on progress
   */
  private calculateEstimatedTimeRemaining(percentage: number): number {
    if (percentage <= 0) return 0;

    const elapsed = new Date().getTime() - this._createdAt.getTime();
    const estimatedTotal = (elapsed / percentage) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  /**
   * Calculate expiration date based on business rules
   */
  private calculateExpirationDate(generatedAt: Date): Date {
    const expirationMs = ReportBusinessRules.MAX_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return new Date(generatedAt.getTime() + expirationMs);
  }
}

/**
 * Report factory for creating different types of reports
 */
export class ReportFactory {
  /**
   * Create report from execution request
   */
  static fromExecutionRequest(request: ReportExecutionRequest): Report {
    return Report.create({
      reportType: request.reportType,
      format: request.format,
      parameters: request.parameters,
      filters: request.filters,
      options: request.options,
      context: request.context,
    });
  }

  /**
   * Create scheduled report
   */
  static createScheduledReport(
    reportType: ReportType,
    format: ReportFormat,
    parameters: Record<string, unknown>,
    context: ReportExecutionContext
  ): Report {
    return Report.create({
      reportType,
      format,
      parameters,
      filters: {},
      options: { isScheduled: true },
      context,
    });
  }

  /**
   * Restore report from execution result
   */
  static fromExecutionResult(result: ReportExecutionResult): Report {
    return Report.restore(result);
  }
}

/**
 * Report utilities
 */
export const ReportUtils = {
  /**
   * Check if reports are equal
   */
  areEqual: (report1: Report, report2: Report): boolean => {
    return report1.getId() === report2.getId();
  },

  /**
   * Compare reports by creation date
   */
  compareByCreatedAt: (report1: Report, report2: Report): number => {
    return report2.getCreatedAt().getTime() - report1.getCreatedAt().getTime();
  },

  /**
   * Compare reports by status priority
   */
  compareByStatusPriority: (report1: Report, report2: Report): number => {
    const priorityMap = {
      [ReportStatus.FAILED]: 1,
      [ReportStatus.TIMEOUT]: 2,
      [ReportStatus.RUNNING]: 3,
      [ReportStatus.PENDING]: 4,
      [ReportStatus.COMPLETED]: 5,
      [ReportStatus.CANCELLED]: 6,
    };

    const priority1 = priorityMap[report1.getStatus().toString() as ReportStatus] || 7;
    const priority2 = priorityMap[report2.getStatus().toString() as ReportStatus] || 7;

    return priority1 - priority2;
  },

  /**
   * Filter reports by status
   */
  filterByStatus: (reports: Report[], status: ReportStatus): Report[] => {
    return reports.filter((report) => report.getStatus().toString() === status);
  },

  /**
   * Filter expired reports
   */
  filterExpired: (reports: Report[]): Report[] => {
    return reports.filter((report) => report.isExpired());
  },

  /**
   * Get report summary
   */
  getSummary: (report: Report): string => {
    const type = report.getReportType();
    const status = report.getStatus().getDisplayName();
    const createdAt = report.getCreatedAt().toLocaleDateString();
    return `${type} report (${status}) - ${createdAt}`;
  },
} as const;
