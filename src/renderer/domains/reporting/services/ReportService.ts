/**
 * Report Service
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Main service that orchestrates the entire report generation process.
 *
 * @domain Reporting
 * @pattern Service Layer / Facade
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportType, ReportTypeValue } from '../valueObjects/ReportType';
import { ReportFormat } from '../valueObjects/ReportFormat';
import { ReportStatus } from '../valueObjects/ReportStatus';
import { Report, ReportFactory } from '../entities/Report';
import { ReportExportService, ExportContext, ExportOptions } from './ReportExportService';
import { ReportTemplateService, TemplateContext } from './ReportTemplateService';
import { ReportFileService } from './ReportFileService';
import type {
  IReportService,
  ReportExecutionRequest,
  ReportExecutionResult,
  ReportTemplate,
  ReportAnalytics,
  ReportData,
  ReportErrorCode,
} from '../types/ReportTypes';
import { ReportBusinessRules, ReportErrorCodes } from '../types/ReportTypes';

/**
 * Service execution context
 */
export interface ServiceExecutionContext {
  readonly requestId: string;
  readonly startTime: Date;
  readonly timeout: number;
  readonly clientInfo?: {
    readonly userAgent: string;
    readonly deviceType: 'desktop' | 'mobile' | 'tablet';
  };
}

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  readonly hasAccess: boolean;
  readonly missingPermissions: string[];
  readonly grantedPermissions: string[];
}

/**
 * Report Service Implementation
 * Main facade service that orchestrates all report operations
 */
export class ReportService implements IReportService {
  private static readonly runningReports = new Map<string, Report>();
  private static readonly executionQueue = new Map<string, Promise<ReportExecutionResult>>();

  private readonly exportService: ReportExportService;

  constructor() {
    this.exportService = new ReportExportService();
  }

  /**
   * Execute a report
   */
  async executeReport(request: ReportExecutionRequest): Promise<ReportExecutionResult> {
    const context = this.createServiceContext(request);

    console.log(`🚀 Report Service: Starting report execution`, {
      reportType: request.reportType,
      format: request.format,
      requestId: context.requestId,
      agencyId: request.context.agencyId,
      userId: request.context.userId,
    });

    try {
      // Validate request
      await this.validateReportRequest(request);

      // Check permissions
      const permissionResult = await this.validatePermissions(request);
      if (!permissionResult.hasAccess) {
        throw new ReportServiceError(
          ReportErrorCodes.INSUFFICIENT_PERMISSIONS,
          `Insufficient permissions to generate ${request.reportType} report`,
          {
            missingPermissions: permissionResult.missingPermissions,
            grantedPermissions: permissionResult.grantedPermissions,
          }
        );
      }

      // Check concurrent limit
      await this.checkConcurrentLimit(request.context.userId);

      // Create report entity
      const report = ReportFactory.fromExecutionRequest(request);
      ReportService.runningReports.set(report.getId(), report);

      // Execute report in queue to manage concurrency
      const executionPromise = this.executeReportInternal(report, request, context);
      ReportService.executionQueue.set(report.getId(), executionPromise);

      // Start execution
      report.start();

      // Wait for completion with timeout
      const result = await Promise.race([executionPromise, this.createTimeoutPromise(context.timeout, report.getId())]);

      // Clean up
      ReportService.runningReports.delete(report.getId());
      ReportService.executionQueue.delete(report.getId());

      console.log(`✅ Report Service: Report execution completed`, {
        reportId: report.getId(),
        status: result.status,
        executionTime: result.metadata.executionTime,
        recordCount: result.metadata.recordCount,
      });

      return result;
    } catch (error) {
      console.error(`❌ Report Service: Report execution failed:`, error);

      // Clean up on error
      const reportId = context.requestId;
      const report = ReportService.runningReports.get(reportId);
      if (report) {
        if (error instanceof TimeoutError) {
          report.timeout();
        } else {
          report.fail({
            code: error instanceof ReportServiceError ? error.code : ReportErrorCodes.GENERATION_FAILED,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date(),
            recoverable: true,
          });
        }

        ReportService.runningReports.delete(reportId);
        ReportService.executionQueue.delete(reportId);

        return report.toExecutionResult();
      }

      // Return error result
      return {
        id: context.requestId,
        reportType: request.reportType,
        format: request.format,
        status: ReportStatus.FAILED,
        metadata: {
          executionTime: Date.now() - context.startTime.getTime(),
          recordCount: 0,
          generatedAt: new Date(),
        },
        error: {
          code: error instanceof ReportServiceError ? error.code : ReportErrorCodes.GENERATION_FAILED,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Get report execution status
   */
  async getReportStatus(executionId: string): Promise<ReportExecutionResult> {
    console.log(`📊 Report Service: Getting status for execution ${executionId}`);

    const report = ReportService.runningReports.get(executionId);
    if (report) {
      return report.toExecutionResult();
    }

    // Check if execution is queued
    const queuedExecution = ReportService.executionQueue.get(executionId);
    if (queuedExecution) {
      try {
        // Return current status without waiting for completion
        const result = await Promise.race([queuedExecution, Promise.resolve(this.createPendingResult(executionId))]);
        return result;
      } catch (error) {
        return this.createErrorResult(
          executionId,
          ReportErrorCodes.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    // Report not found
    return this.createErrorResult(
      executionId,
      ReportErrorCodes.INTERNAL_ERROR,
      `Report execution ${executionId} not found`
    );
  }

  /**
   * Cancel report execution
   */
  async cancelReportExecution(executionId: string): Promise<boolean> {
    console.log(`🛑 Report Service: Cancelling execution ${executionId}`);

    const report = ReportService.runningReports.get(executionId);
    if (!report) {
      console.log(`❌ Report Service: Execution ${executionId} not found`);
      return false;
    }

    try {
      report.cancel('User requested cancellation');

      // Clean up
      ReportService.runningReports.delete(executionId);
      ReportService.executionQueue.delete(executionId);

      console.log(`✅ Report Service: Execution ${executionId} cancelled successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Report Service: Failed to cancel execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates(category?: string): Promise<ReportTemplate[]> {
    console.log(`📋 Report Service: Getting report templates${category ? ` for category ${category}` : ''}`);

    try {
      const templates = await ReportTemplateService.getReportTemplates(category);

      console.log(`✅ Report Service: Retrieved ${templates.length} templates`);
      return templates;
    } catch (error) {
      console.error(`❌ Report Service: Failed to get templates:`, error);
      return [];
    }
  }

  /**
   * Get report template by type
   */
  async getReportTemplate(reportType: ReportType): Promise<ReportTemplate | null> {
    console.log(`📋 Report Service: Getting template for ${reportType}`);

    try {
      const template = await ReportTemplateService.getReportTemplate(reportType);

      if (template) {
        console.log(`✅ Report Service: Found template for ${reportType}`);
      } else {
        console.log(`❌ Report Service: Template not found for ${reportType}`);
      }

      return template;
    } catch (error) {
      console.error(`❌ Report Service: Failed to get template for ${reportType}:`, error);
      return null;
    }
  }

  /**
   * Get available report types for user
   */
  async getAvailableReportTypes(permissions: string[]): Promise<ReportType[]> {
    console.log(`📋 Report Service: Getting available report types for user permissions`);

    try {
      const allTypes = ReportTypeValue.getAllTypes();
      const availableTypes: ReportType[] = [];

      for (const reportType of allTypes) {
        const typeValue = ReportTypeValue.from(reportType);
        const requiredPermissions = typeValue.getRequiredPermissions();

        // Check if user has all required permissions
        const hasAccess = requiredPermissions.every((permission) => permissions.includes(permission));

        if (hasAccess) {
          availableTypes.push(reportType);
        }
      }

      console.log(`✅ Report Service: Found ${availableTypes.length} available report types`);
      return availableTypes;
    } catch (error) {
      console.error(`❌ Report Service: Failed to get available report types:`, error);
      return [];
    }
  }

  /**
   * Validate report parameters
   */
  async validateReportParameters(reportType: ReportType, parameters: Record<string, unknown>): Promise<boolean> {
    console.log(`🔍 Report Service: Validating parameters for ${reportType}`);

    try {
      const template = await ReportTemplateService.getReportTemplate(reportType);
      if (!template) {
        console.log(`❌ Report Service: Template not found for ${reportType}`);
        return false;
      }

      // Create mock context for validation
      const context: TemplateContext = {
        agencyId: 'validation',
        userId: 'validation',
        parameters,
        filters: {},
        dateRange: {
          startDate: new Date(),
          endDate: new Date(),
        },
      };

      const validation = await ReportTemplateService.validateTemplate(template, context);

      if (validation.isValid) {
        console.log(`✅ Report Service: Parameters valid for ${reportType}`);
      } else {
        console.log(`❌ Report Service: Parameter validation failed for ${reportType}:`, validation.errors);
      }

      return validation.isValid;
    } catch (error) {
      console.error(`❌ Report Service: Failed to validate parameters for ${reportType}:`, error);
      return false;
    }
  }

  /**
   * Get report analytics
   */
  async getReportAnalytics(agencyId: string, dateRange: { startDate: Date; endDate: Date }): Promise<ReportAnalytics> {
    console.log(`📊 Report Service: Getting analytics for agency ${agencyId}`, dateRange);

    try {
      // In a real implementation, this would query actual report execution history
      // For now, return mock analytics
      const mockAnalytics: ReportAnalytics = {
        totalReports: 156,
        reportsByType: {
          [ReportType.ACCOUNTS_RECEIVABLE_AGING]: 45,
          [ReportType.SALES_SUMMARY]: 38,
          [ReportType.INVENTORY_STOCK_LEVELS]: 32,
          [ReportType.CREDIT_RISK_ASSESSMENT]: 24,
          [ReportType.PAYMENT_COLLECTION_REPORT]: 17,
        } as Record<ReportType, number>,
        reportsByFormat: {
          [ReportFormat.PDF]: 89,
          [ReportFormat.EXCEL]: 45,
          [ReportFormat.CSV]: 22,
        } as Record<ReportFormat, number>,
        reportsByStatus: {
          [ReportStatus.COMPLETED]: 142,
          [ReportStatus.FAILED]: 8,
          [ReportStatus.CANCELLED]: 6,
        } as Record<ReportStatus, number>,
        averageExecutionTime: 12500, // 12.5 seconds
        totalExecutionTime: 1950000, // Total time in ms
        mostPopularReports: [
          {
            reportType: ReportType.ACCOUNTS_RECEIVABLE_AGING,
            count: 45,
            averageTime: 15000,
          },
          {
            reportType: ReportType.SALES_SUMMARY,
            count: 38,
            averageTime: 8500,
          },
          {
            reportType: ReportType.INVENTORY_STOCK_LEVELS,
            count: 32,
            averageTime: 6200,
          },
        ],
        failureRate: 5.1, // 5.1%
        scheduledReportsCount: 12,
        activeSchedulesCount: 8,
        period: dateRange,
        agencyId,
        generatedAt: new Date(),
      };

      console.log(`✅ Report Service: Analytics retrieved for agency ${agencyId}`);
      return mockAnalytics;
    } catch (error) {
      console.error(`❌ Report Service: Failed to get analytics for agency ${agencyId}:`, error);

      // Return empty analytics on error
      return {
        totalReports: 0,
        reportsByType: {} as Record<ReportType, number>,
        reportsByFormat: {} as Record<ReportFormat, number>,
        reportsByStatus: {} as Record<ReportStatus, number>,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        mostPopularReports: [],
        failureRate: 0,
        scheduledReportsCount: 0,
        activeSchedulesCount: 0,
        period: dateRange,
        agencyId,
        generatedAt: new Date(),
      };
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Execute report internally
   */
  private async executeReportInternal(
    report: Report,
    request: ReportExecutionRequest,
    context: ServiceExecutionContext
  ): Promise<ReportExecutionResult> {
    try {
      // Update progress: Getting template
      report.updateProgress(10, 'Template', 'Loading report template');

      // Get template
      const template = await ReportTemplateService.getReportTemplate(request.reportType);
      if (!template) {
        throw new ReportServiceError(
          ReportErrorCodes.CONFIGURATION_ERROR,
          `Template not found for report type: ${request.reportType}`
        );
      }

      // Update progress: Generating data
      report.updateProgress(30, 'Data Generation', 'Generating report data');

      // Generate report data
      const templateContext: TemplateContext = {
        agencyId: request.context.agencyId,
        userId: request.context.userId,
        parameters: {
          ...request.parameters,
          // Include required parameters that templates expect
          dateRange: this.extractDateRange(request.parameters),
          agencyId: request.context.agencyId,
        },
        filters: request.filters || {},
        dateRange: this.extractDateRange(request.parameters),
      };

      console.log(`🔍 ReportService: Template context created:`, {
        agencyId: templateContext.agencyId,
        userId: templateContext.userId,
        parametersKeys: Object.keys(templateContext.parameters),
        hasDateRangeInParams: 'dateRange' in templateContext.parameters,
        hasAgencyIdInParams: 'agencyId' in templateContext.parameters,
        dateRange: templateContext.dateRange,
      });

      const dataResult = await ReportTemplateService.generateReportData(template, templateContext);
      if (!dataResult.success || !dataResult.data) {
        throw new ReportServiceError(
          dataResult.error?.code || ReportErrorCodes.GENERATION_FAILED,
          dataResult.error?.message || 'Failed to generate report data'
        );
      }

      // Update progress: Exporting
      report.updateProgress(70, 'Export', 'Converting to export format');

      // Export report
      const exportContext: ExportContext = {
        userId: request.context.userId,
        agencyId: request.context.agencyId,
        timestamp: new Date(),
        clientInfo: context.clientInfo,
      };

      const exportOptions: ExportOptions = {
        ...request.options,
        quality: 'standard',
      };

      const exportedBlob = await this.exportService.exportReport(
        dataResult.data,
        request.format,
        exportOptions,
        exportContext
      );

      // Update progress: Storing file
      report.updateProgress(90, 'Storage', 'Storing report file');

      // Store file
      const fileName = this.generateFileName(dataResult.data.title, request.format, new Date());

      const fileResult = await ReportFileService.storeFile(
        exportedBlob,
        fileName,
        request.format,
        request.reportType,
        request.context.agencyId,
        request.context.userId,
        {
          encrypt: exportOptions.encrypt,
          compress: exportOptions.compress,
        }
      );

      if (!fileResult.success || !fileResult.url) {
        throw new ReportServiceError(
          fileResult.error?.code || ReportErrorCodes.INTERNAL_ERROR,
          fileResult.error?.message || 'Failed to store report file'
        );
      }

      // Complete report
      report.complete(dataResult.data, fileResult.url);

      return report.toExecutionResult();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate report request
   */
  private async validateReportRequest(request: ReportExecutionRequest): Promise<void> {
    // Validate report type
    if (!Object.values(ReportType).includes(request.reportType)) {
      throw new ReportServiceError(ReportErrorCodes.INVALID_PARAMETERS, `Invalid report type: ${request.reportType}`);
    }

    // Validate format
    if (!Object.values(ReportFormat).includes(request.format)) {
      throw new ReportServiceError(ReportErrorCodes.INVALID_FORMAT, `Invalid report format: ${request.format}`);
    }

    // Validate context
    if (!request.context.agencyId || !request.context.userId) {
      throw new ReportServiceError(ReportErrorCodes.INVALID_PARAMETERS, 'Agency ID and User ID are required');
    }

    // Validate date range if present
    const dateRange = this.extractDateRange(request.parameters);
    if (dateRange.startDate > dateRange.endDate) {
      throw new ReportServiceError(ReportErrorCodes.INVALID_DATE_RANGE, 'Start date cannot be after end date');
    }

    // Validate data range limits
    const typeValue = ReportTypeValue.from(request.reportType);
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > typeValue.getMaxDataRange()) {
      throw new ReportServiceError(
        ReportErrorCodes.INVALID_DATE_RANGE,
        `Date range of ${daysDiff} days exceeds maximum allowed range of ${typeValue.getMaxDataRange()} days for ${request.reportType}`
      );
    }
  }

  /**
   * Validate user permissions
   */
  private async validatePermissions(request: ReportExecutionRequest): Promise<PermissionValidationResult> {
    const typeValue = ReportTypeValue.from(request.reportType);
    const requiredPermissions = typeValue.getRequiredPermissions();
    const userPermissions = request.context.permissions;

    console.log(`🔐 ReportService: Permission validation for ${request.reportType}`, {
      requiredPermissions,
      userPermissions,
      userId: request.context.userId,
      userRole: request.context.userRole,
    });

    const missingPermissions = requiredPermissions.filter((permission) => !userPermissions.includes(permission));
    const grantedPermissions = requiredPermissions.filter((permission) => userPermissions.includes(permission));

    const result = {
      hasAccess: missingPermissions.length === 0,
      missingPermissions,
      grantedPermissions,
    };

    console.log(`🔐 ReportService: Permission validation result:`, result);

    return result;
  }

  /**
   * Check concurrent execution limit
   */
  private async checkConcurrentLimit(userId: string): Promise<void> {
    const userReports = Array.from(ReportService.runningReports.values()).filter(
      (report) => report.getContext().userId === userId
    );

    if (userReports.length >= ReportBusinessRules.MAX_CONCURRENT_REPORTS) {
      throw new ReportServiceError(
        ReportErrorCodes.CONCURRENT_LIMIT_EXCEEDED,
        `Maximum concurrent reports (${ReportBusinessRules.MAX_CONCURRENT_REPORTS}) exceeded for user ${userId}`
      );
    }
  }

  /**
   * Create service execution context
   */
  private createServiceContext(request: ReportExecutionRequest): ServiceExecutionContext {
    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      timeout: ReportBusinessRules.MAX_REPORT_EXECUTION_TIME,
      clientInfo: request.context.clientInfo,
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number, reportId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Report execution timed out after ${timeout}ms`, reportId));
      }, timeout);
    });
  }

  /**
   * Extract date range from parameters
   */
  private extractDateRange(parameters: Record<string, unknown>): { startDate: Date; endDate: Date } {
    const dateRange = parameters.dateRange as { startDate: Date; endDate: Date } | undefined;

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      return {
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate),
      };
    }

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    return { startDate, endDate };
  }

  /**
   * Generate file name
   */
  private generateFileName(title: string, format: ReportFormat, timestamp: Date): string {
    const baseName = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const dateStr = timestamp.toISOString().slice(0, 19).replace(/[:-]/g, '');
    const extension = this.getFileExtension(format);

    return `${baseName}_${dateStr}.${extension}`;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ReportFormat): string {
    const extensions = {
      [ReportFormat.PDF]: 'pdf',
      [ReportFormat.EXCEL]: 'xlsx',
      [ReportFormat.CSV]: 'csv',
      [ReportFormat.JSON]: 'json',
      [ReportFormat.XML]: 'xml',
      [ReportFormat.HTML]: 'html',
      [ReportFormat.PRINT]: 'pdf',
    };

    return extensions[format] || 'pdf';
  }

  /**
   * Create pending result
   */
  private createPendingResult(executionId: string): ReportExecutionResult {
    return {
      id: executionId,
      reportType: ReportType.CUSTOM_REPORT, // Will be updated when actual report is found
      format: ReportFormat.PDF,
      status: ReportStatus.PENDING,
      metadata: {
        executionTime: 0,
        recordCount: 0,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(executionId: string, code: ReportErrorCode, message: string): ReportExecutionResult {
    return {
      id: executionId,
      reportType: ReportType.CUSTOM_REPORT,
      format: ReportFormat.PDF,
      status: ReportStatus.FAILED,
      metadata: {
        executionTime: 0,
        recordCount: 0,
        generatedAt: new Date(),
      },
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Get running reports statistics
   */
  static getRunningReportsStats(): {
    totalRunning: number;
    byUser: Record<string, number>;
    byType: Record<ReportType, number>;
    oldestStartTime?: Date;
  } {
    const stats = {
      totalRunning: ReportService.runningReports.size,
      byUser: {} as Record<string, number>,
      byType: {} as Record<ReportType, number>,
      oldestStartTime: undefined as Date | undefined,
    };

    for (const report of ReportService.runningReports.values()) {
      const userId = report.getContext().userId;
      const reportType = report.getReportType();
      const createdAt = report.getCreatedAt();

      // Count by user
      stats.byUser[userId] = (stats.byUser[userId] || 0) + 1;

      // Count by type
      stats.byType[reportType] = (stats.byType[reportType] || 0) + 1;

      // Track oldest
      if (!stats.oldestStartTime || createdAt < stats.oldestStartTime) {
        stats.oldestStartTime = createdAt;
      }
    }

    return stats;
  }

  /**
   * Clean up stale executions
   */
  static async cleanupStaleExecutions(maxAge: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [reportId, report] of ReportService.runningReports) {
      const age = now - report.getCreatedAt().getTime();

      if (age > maxAge) {
        try {
          report.timeout();
          ReportService.runningReports.delete(reportId);
          ReportService.executionQueue.delete(reportId);
          cleaned++;
        } catch (error) {
          console.error(`❌ Report Service: Failed to cleanup stale execution ${reportId}:`, error);
        }
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Report Service: Cleaned up ${cleaned} stale executions`);
    }

    return cleaned;
  }
}

/**
 * Report service error class
 */
export class ReportServiceError extends Error {
  constructor(
    public readonly code: ReportErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReportServiceError';
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly reportId: string
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Report service factory
 */
export class ReportServiceFactory {
  /**
   * Create report service instance
   */
  static createReportService(): ReportService {
    return new ReportService();
  }

  /**
   * Create singleton instance
   */
  private static instance: ReportService | null = null;

  static getInstance(): ReportService {
    if (!ReportServiceFactory.instance) {
      ReportServiceFactory.instance = new ReportService();
    }
    return ReportServiceFactory.instance;
  }
}

/**
 * Report service utilities
 */
export const ReportServiceUtils = {
  /**
   * Estimate total execution time
   */
  estimateExecutionTime: (reportType: ReportType, recordCount: number, format: ReportFormat): number => {
    const typeValue = ReportTypeValue.from(reportType);
    let baseTime = typeValue.getEstimatedTime() * 1000; // Convert to milliseconds

    // Adjust for record count
    const recordFactor = Math.log10(Math.max(recordCount, 1)) / 3;
    baseTime *= 1 + recordFactor;

    // Adjust for format complexity
    const formatFactors = {
      [ReportFormat.PDF]: 1.5,
      [ReportFormat.EXCEL]: 1.2,
      [ReportFormat.CSV]: 0.8,
      [ReportFormat.JSON]: 0.6,
      [ReportFormat.XML]: 0.9,
      [ReportFormat.HTML]: 1.1,
      [ReportFormat.PRINT]: 1.6,
    };

    baseTime *= formatFactors[format] || 1.0;

    return Math.round(baseTime);
  },

  /**
   * Get queue position
   */
  getQueuePosition: (reportId: string): number => {
    const queueIds = Array.from(ReportService.runningReports.keys());
    const position = queueIds.indexOf(reportId);
    return position >= 0 ? position + 1 : -1;
  },

  /**
   * Format execution time
   */
  formatExecutionTime: (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  },
} as const;
