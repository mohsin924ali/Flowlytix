/**
 * Reporting Domain Barrel Export
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Centralized exports for the reporting domain.
 *
 * @domain Reporting
 * @pattern Barrel Export
 * @architecture Clean Architecture
 * @version 1.0.0
 */

// ==================== VALUE OBJECTS ====================
export {
  ReportType,
  ReportCategory,
  ReportComplexity,
  ReportFrequency,
  ReportTypeValue,
  ReportTypeUtils,
  type ReportTypeMetadata,
} from './valueObjects/ReportType';

export {
  ReportStatus,
  ReportStatusValue,
  ReportStatusUtils,
  type ReportStatusMetadata,
} from './valueObjects/ReportStatus';

export {
  ReportFormat,
  ReportFormatValue,
  ReportFormatUtils,
  type ReportFormatMetadata,
  type FormatFeatures,
} from './valueObjects/ReportFormat';

export {
  ScheduleStatus,
  DayOfWeek,
  MonthlyType,
  ReportScheduleValue,
  ReportScheduleUtils,
  type ScheduleConfiguration,
  type ScheduleMetadata,
  type NextExecutionResult,
} from './valueObjects/ReportSchedule';

// ==================== ENTITIES ====================
export {
  Report,
  ReportFactory,
  ReportUtils,
  type ReportId,
  type CreateReportData,
  type ReportMetadata,
  type ReportError,
  type ReportProgress,
} from './entities/Report';

export {
  ScheduledReport,
  ScheduledReportFactory,
  ScheduledReportUtils,
  type ScheduledReportId,
  type CreateScheduledReportData,
  type ScheduledReportMetadata,
  type ExecutionHistory,
} from './entities/ScheduledReport';

// ==================== TYPES ====================
export type {
  // Core interfaces
  ReportParameter,
  ReportExecutionContext,
  ReportDataSource,
  ReportTemplate,
  ReportExecutionRequest,
  ReportExecutionResult,
  ReportSchedule,
  ReportHistoryEntry,
  ReportAnalytics,

  // Data interfaces
  ChartData,
  TableData,
  MetricData,
  ReportSection,
  ReportData,

  // API interfaces
  ApiResponse,
  PaginatedResponse,

  // Service interfaces
  IReportService,
  IReportSchedulerService,
  IReportExportService,
  IReportRepository,

  // Utility types
  ReportCreateForm,
  ReportScheduleCreateForm,
  ReportFilterOptions,
  ReportSortOptions,
  ReportPermissionCheck,
  ReportErrorCode,
} from './types/ReportTypes';

export {
  // Validation schemas
  ReportParameterSchema,
  ReportExecutionRequestSchema,
  ReportScheduleSchema,

  // Business rules and constants
  ReportBusinessRules,
  ReportErrorCodes,
} from './types/ReportTypes';

// ==================== DOMAIN UTILITIES ====================

/**
 * Report domain utilities
 */
export const ReportingDomainUtils = {
  /**
   * Generate report file name
   */
  generateFileName: (reportType: ReportType, format: ReportFormat, timestamp?: Date): string => {
    const typeValue = ReportTypeValue.from(reportType);
    const formatValue = ReportFormatValue.from(format);

    const baseName = typeValue
      .getDisplayName()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const dateStr = timestamp
      ? timestamp.toISOString().slice(0, 10).replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return `${baseName}_${dateStr}.${formatValue.getFileExtension()}`;
  },

  /**
   * Calculate report complexity score
   */
  calculateComplexityScore: (recordCount: number, chartCount: number, tableCount: number): number => {
    let score = 0;

    // Record count scoring
    if (recordCount > 100000) score += 50;
    else if (recordCount > 10000) score += 30;
    else if (recordCount > 1000) score += 15;
    else score += 5;

    // Chart complexity
    score += chartCount * 10;

    // Table complexity
    score += tableCount * 5;

    return Math.min(score, 100);
  },

  /**
   * Estimate processing time
   */
  estimateProcessingTime: (reportType: ReportType, recordCount: number, format: ReportFormat): number => {
    const typeValue = ReportTypeValue.from(reportType);
    const formatValue = ReportFormatValue.from(format);

    let baseTime = typeValue.getEstimatedTime() * 1000; // Convert to milliseconds

    // Adjust for record count
    const recordFactor = Math.log10(Math.max(recordCount, 1)) / 3;
    baseTime *= 1 + recordFactor;

    // Adjust for format complexity
    const formatRatio = formatValue.getEstimatedSizeRatio();
    baseTime *= formatRatio;

    return Math.round(baseTime);
  },

  /**
   * Validate report permissions
   */
  validatePermissions: (
    reportType: ReportType,
    userPermissions: string[]
  ): { hasAccess: boolean; missingPermissions: string[] } => {
    const typeValue = ReportTypeValue.from(reportType);
    const requiredPermissions = typeValue.getRequiredPermissions();

    const missingPermissions = requiredPermissions.filter((permission) => !userPermissions.includes(permission));

    return {
      hasAccess: missingPermissions.length === 0,
      missingPermissions,
    };
  },

  /**
   * Get recommended export format
   */
  getRecommendedFormat: (reportType: ReportType, recordCount: number, hasCharts: boolean = false): ReportFormat => {
    const typeValue = ReportTypeValue.from(reportType);
    const supportedFormats = typeValue.getSupportedFormats();

    // For large datasets, prefer CSV
    if (recordCount > 50000 && supportedFormats.includes('CSV')) {
      return ReportFormat.CSV;
    }

    // For reports with charts, prefer PDF
    if (hasCharts && supportedFormats.includes('PDF')) {
      return ReportFormat.PDF;
    }

    // For medium datasets with analysis needs, prefer Excel
    if (recordCount > 1000 && supportedFormats.includes('EXCEL')) {
      return ReportFormat.EXCEL;
    }

    // Default to PDF for most cases
    return supportedFormats.includes('PDF') ? ReportFormat.PDF : ReportFormat.CSV;
  },

  /**
   * Format report summary
   */
  formatSummary: (
    reportType: ReportType,
    status: ReportStatus,
    recordCount?: number,
    executionTime?: number
  ): string => {
    const typeValue = ReportTypeValue.from(reportType);
    const statusValue = ReportStatusValue.from(status);

    let summary = `${typeValue.getDisplayName()} - ${statusValue.getDisplayName()}`;

    if (recordCount !== undefined) {
      summary += ` (${recordCount.toLocaleString()} records)`;
    }

    if (executionTime !== undefined) {
      const seconds = Math.round(executionTime / 1000);
      summary += ` - ${seconds}s`;
    }

    return summary;
  },

  /**
   * Check if report supports real-time data
   */
  supportsRealTimeData: (reportType: ReportType): boolean => {
    const realTimeReports = [
      ReportType.DAILY_CASH_FLOW,
      ReportType.INVENTORY_STOCK_LEVELS,
      ReportType.SALES_SUMMARY,
      ReportType.KPI_DASHBOARD,
    ];

    return realTimeReports.includes(reportType);
  },

  /**
   * Get default date range for report type
   */
  getDefaultDateRange: (reportType: ReportType): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (reportType) {
      case ReportType.DAILY_CASH_FLOW:
        startDate.setDate(endDate.getDate() - 7); // Last 7 days
        break;

      case ReportType.ACCOUNTS_RECEIVABLE_AGING:
        startDate.setDate(endDate.getDate() - 90); // Last 90 days
        break;

      case ReportType.SALES_SUMMARY:
      case ReportType.CUSTOMER_ACTIVITY:
        startDate.setDate(endDate.getDate() - 30); // Last 30 days
        break;

      case ReportType.PRODUCT_PERFORMANCE:
      case ReportType.INVENTORY_MOVEMENT:
        startDate.setDate(endDate.getDate() - 60); // Last 60 days
        break;

      case ReportType.TREND_ANALYSIS:
      case ReportType.CUSTOMER_LIFETIME_VALUE:
        startDate.setFullYear(endDate.getFullYear() - 1); // Last year
        break;

      default:
        startDate.setDate(endDate.getDate() - 30); // Default 30 days
        break;
    }

    return { startDate, endDate };
  },
} as const;

// ==================== DOMAIN EVENTS ====================

/**
 * Report domain events for event-driven architecture
 */
export const ReportDomainEvents = {
  REPORT_CREATED: 'report.created',
  REPORT_STARTED: 'report.started',
  REPORT_PROGRESS_UPDATED: 'report.progress.updated',
  REPORT_COMPLETED: 'report.completed',
  REPORT_FAILED: 'report.failed',
  REPORT_CANCELLED: 'report.cancelled',
  REPORT_EXPIRED: 'report.expired',
  REPORT_EXPORTED: 'report.exported',
  SCHEDULE_CREATED: 'schedule.created',
  SCHEDULE_EXECUTED: 'schedule.executed',
  SCHEDULE_FAILED: 'schedule.failed',
} as const;

/**
 * Report permissions for role-based access control
 */
export const ReportPermissions = {
  // General report permissions
  REPORT_VIEW: 'report.view',
  REPORT_CREATE: 'report.create',
  REPORT_EXPORT: 'report.export',
  REPORT_DELETE: 'report.delete',

  // Financial report permissions
  FINANCIAL_REPORTS_VIEW: 'financial.reports.view',
  CREDIT_REPORTS_VIEW: 'credit.reports.view',
  PAYMENT_REPORTS_VIEW: 'payment.reports.view',

  // Sales report permissions
  SALES_REPORTS_VIEW: 'sales.reports.view',
  CUSTOMER_REPORTS_VIEW: 'customer.reports.view',

  // Operational report permissions
  INVENTORY_REPORTS_VIEW: 'inventory.reports.view',
  OPERATIONAL_REPORTS_VIEW: 'operational.reports.view',

  // Management report permissions
  MANAGEMENT_REPORTS_VIEW: 'management.reports.view',
  EXECUTIVE_REPORTS_VIEW: 'executive.reports.view',

  // Compliance report permissions
  AUDIT_REPORTS_VIEW: 'audit.reports.view',
  COMPLIANCE_REPORTS_VIEW: 'compliance.reports.view',

  // Schedule permissions
  SCHEDULE_CREATE: 'schedule.create',
  SCHEDULE_MANAGE: 'schedule.manage',
  SCHEDULE_DELETE: 'schedule.delete',

  // Administrative permissions
  REPORT_ADMIN: 'report.admin',
  TEMPLATE_MANAGE: 'template.manage',
  SYSTEM_REPORTS_VIEW: 'system.reports.view',
} as const;

/**
 * Report feature flags for gradual rollout
 */
export const ReportFeatureFlags = {
  ENABLE_REAL_TIME_REPORTS: 'enable_real_time_reports',
  ENABLE_CUSTOM_TEMPLATES: 'enable_custom_templates',
  ENABLE_ADVANCED_SCHEDULING: 'enable_advanced_scheduling',
  ENABLE_CHART_GENERATION: 'enable_chart_generation',
  ENABLE_EMAIL_DELIVERY: 'enable_email_delivery',
  ENABLE_REPORT_CACHING: 'enable_report_caching',
  ENABLE_BULK_EXPORT: 'enable_bulk_export',
  ENABLE_WATERMARKS: 'enable_watermarks',
  ENABLE_ENCRYPTION: 'enable_encryption',
} as const;

// Import values for utility functions
import { ReportType, ReportTypeValue } from './valueObjects/ReportType';
import { ReportFormat, ReportFormatValue } from './valueObjects/ReportFormat';
import { ReportStatus, ReportStatusValue } from './valueObjects/ReportStatus';
