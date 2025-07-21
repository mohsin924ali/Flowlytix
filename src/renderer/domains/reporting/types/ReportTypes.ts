/**
 * Report Domain Types and Interfaces
 *
 * Comprehensive type definitions for the reporting domain.
 * Following strict TypeScript standards with proper JSDoc documentation.
 *
 * @domain Reporting
 * @pattern Type Definitions
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import { ReportType, ReportCategory, ReportComplexity, ReportFrequency } from '../valueObjects/ReportType';
import { ReportStatus } from '../valueObjects/ReportStatus';
import { ReportFormat } from '../valueObjects/ReportFormat';

// ==================== CORE REPORT INTERFACES ====================

/**
 * Report parameter interface
 */
export interface ReportParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  readonly label: string;
  readonly description?: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly options?: Array<{ value: unknown; label: string }>;
  readonly validation?: z.ZodSchema;
  readonly dependsOn?: string[];
  readonly group?: string;
}

/**
 * Report execution context
 */
export interface ReportExecutionContext {
  readonly agencyId: string;
  readonly userId: string;
  readonly userRole: string;
  readonly permissions: string[];
  readonly timestamp: Date;
  readonly clientInfo?: {
    readonly userAgent: string;
    readonly ipAddress: string;
    readonly deviceType: 'desktop' | 'mobile' | 'tablet';
  };
}

/**
 * Report data source configuration
 */
export interface ReportDataSource {
  readonly type: 'database' | 'api' | 'file' | 'cache';
  readonly connection: string;
  readonly query?: string;
  readonly endpoint?: string;
  readonly filters?: Record<string, unknown>;
  readonly cacheTtl?: number; // in seconds
  readonly timeout?: number; // in seconds
}

/**
 * Report template interface
 */
export interface ReportTemplate {
  readonly id: string;
  readonly name: string;
  readonly type: ReportType;
  readonly category: ReportCategory;
  readonly description: string;
  readonly version: string;
  readonly parameters: ReportParameter[];
  readonly dataSource: ReportDataSource;
  readonly supportedFormats: ReportFormat[];
  readonly template: string; // Template content (HTML, JSON, etc.)
  readonly styles?: string; // CSS styles for HTML templates
  readonly scripts?: string; // JavaScript for interactive templates
  readonly isCustom: boolean;
  readonly isPublic: boolean;
  readonly tags: string[];
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Report execution request
 */
export interface ReportExecutionRequest {
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly parameters: Record<string, unknown>;
  readonly filters?: Record<string, unknown>;
  readonly options?: {
    readonly includeCharts?: boolean;
    readonly includeImages?: boolean;
    readonly compress?: boolean;
    readonly encrypt?: boolean;
    readonly watermark?: string;
    readonly pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
    readonly orientation?: 'portrait' | 'landscape';
  };
  readonly context: ReportExecutionContext;
}

/**
 * Report execution result
 */
export interface ReportExecutionResult {
  readonly id: string;
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly status: ReportStatus;
  readonly data?: unknown; // Report data/content
  readonly url?: string; // Download URL for generated file
  readonly metadata: {
    readonly executionTime: number; // in milliseconds
    readonly recordCount: number;
    readonly fileSize?: number; // in bytes
    readonly generatedAt: Date;
    readonly expiresAt?: Date;
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly progress?: {
    readonly percentage: number;
    readonly stage: string;
    readonly message: string;
  };
}

/**
 * Report schedule interface
 */
export interface ReportSchedule {
  readonly id: string;
  readonly name: string;
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly parameters: Record<string, unknown>;
  readonly frequency: ReportFrequency;
  readonly schedule: {
    readonly minute?: number; // 0-59
    readonly hour?: number; // 0-23
    readonly dayOfMonth?: number; // 1-31
    readonly month?: number; // 1-12
    readonly dayOfWeek?: number; // 0-6 (Sunday = 0)
    readonly timezone: string;
  };
  readonly recipients: Array<{
    readonly email: string;
    readonly name?: string;
    readonly type: 'to' | 'cc' | 'bcc';
  }>;
  readonly deliveryOptions: {
    readonly emailSubject?: string;
    readonly emailBody?: string;
    readonly attachFile: boolean;
    readonly includeLink: boolean;
    readonly compress: boolean;
    readonly encrypt: boolean;
  };
  readonly isActive: boolean;
  readonly lastExecutedAt?: Date;
  readonly nextExecutionAt?: Date;
  readonly executionCount: number;
  readonly failureCount: number;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
  readonly agencyId: string;
}

/**
 * Report history entry
 */
export interface ReportHistoryEntry {
  readonly id: string;
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly status: ReportStatus;
  readonly parameters: Record<string, unknown>;
  readonly executionTime: number; // in milliseconds
  readonly recordCount: number;
  readonly fileSize?: number; // in bytes
  readonly downloadCount: number;
  readonly error?: string;
  readonly isScheduled: boolean;
  readonly scheduleId?: string;
  readonly generatedBy: string;
  readonly generatedAt: Date;
  readonly expiresAt?: Date;
  readonly agencyId: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Report analytics data
 */
export interface ReportAnalytics {
  readonly totalReports: number;
  readonly reportsByType: Record<ReportType, number>;
  readonly reportsByFormat: Record<ReportFormat, number>;
  readonly reportsByStatus: Record<ReportStatus, number>;
  readonly averageExecutionTime: number;
  readonly totalExecutionTime: number;
  readonly mostPopularReports: Array<{
    readonly reportType: ReportType;
    readonly count: number;
    readonly averageTime: number;
  }>;
  readonly failureRate: number;
  readonly scheduledReportsCount: number;
  readonly activeSchedulesCount: number;
  readonly period: {
    readonly startDate: Date;
    readonly endDate: Date;
  };
  readonly agencyId: string;
  readonly generatedAt: Date;
}

// ==================== REPORT DATA INTERFACES ====================

/**
 * Chart data interface
 */
export interface ChartData {
  readonly type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  readonly title?: string;
  readonly data: {
    readonly labels: string[];
    readonly datasets: Array<{
      readonly label: string;
      readonly data: number[];
      readonly backgroundColor?: string | string[];
      readonly borderColor?: string;
      readonly borderWidth?: number;
    }>;
  };
  readonly options?: Record<string, unknown>;
}

/**
 * Table data interface
 */
export interface TableData {
  readonly title?: string;
  readonly columns: Array<{
    readonly key: string;
    readonly label: string;
    readonly type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
    readonly format?: string;
    readonly width?: string;
    readonly sortable?: boolean;
    readonly filterable?: boolean;
  }>;
  readonly rows: Array<Record<string, unknown>>;
  readonly summary?: {
    readonly totalRows: number;
    readonly aggregations?: Record<string, number>;
  };
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
  };
}

/**
 * Metric data interface
 */
export interface MetricData {
  readonly label: string;
  readonly value: number | string;
  readonly format: 'number' | 'currency' | 'percentage' | 'duration' | 'text';
  readonly change?: {
    readonly value: number;
    readonly type: 'increase' | 'decrease' | 'neutral';
    readonly period: string;
  };
  readonly trend?: number[]; // Array of values for sparkline
  readonly color?: string;
  readonly icon?: string;
}

/**
 * Report section interface
 */
export interface ReportSection {
  readonly id: string;
  readonly title: string;
  readonly type: 'chart' | 'table' | 'metrics' | 'text' | 'image';
  readonly content: ChartData | TableData | MetricData[] | string;
  readonly layout?: {
    readonly columns: number;
    readonly order: number;
    readonly span?: number;
  };
  readonly style?: Record<string, unknown>;
  readonly conditional?: {
    readonly expression: string;
    readonly showIfTrue: boolean;
  };
}

/**
 * Complete report data
 */
export interface ReportData {
  readonly reportType: ReportType;
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly summary?: {
    readonly keyFindings: string[];
    readonly recommendations?: string[];
    readonly caveats?: string[];
  };
  readonly sections: ReportSection[];
  readonly footer?: {
    readonly generatedAt: Date;
    readonly generatedBy: string;
    readonly dataSource: string;
    readonly disclaimer?: string;
  };
  readonly metadata: {
    readonly parameters: Record<string, unknown>;
    readonly dataRange: {
      readonly startDate: Date;
      readonly endDate: Date;
    };
    readonly recordCount: number;
    readonly executionTime: number;
    readonly version: string;
  };
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Report parameter validation schema
 */
export const ReportParameterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object']),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  options: z
    .array(
      z.object({
        value: z.unknown(),
        label: z.string(),
      })
    )
    .optional(),
  dependsOn: z.array(z.string()).optional(),
  group: z.string().optional(),
});

/**
 * Report execution request validation schema
 */
export const ReportExecutionRequestSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z.record(z.unknown()),
  filters: z.record(z.unknown()).optional(),
  options: z
    .object({
      includeCharts: z.boolean().optional(),
      includeImages: z.boolean().optional(),
      compress: z.boolean().optional(),
      encrypt: z.boolean().optional(),
      watermark: z.string().optional(),
      pageSize: z.enum(['A4', 'A3', 'Letter', 'Legal']).optional(),
      orientation: z.enum(['portrait', 'landscape']).optional(),
    })
    .optional(),
  context: z.object({
    agencyId: z.string().uuid(),
    userId: z.string().uuid(),
    userRole: z.string(),
    permissions: z.array(z.string()),
    timestamp: z.date(),
    clientInfo: z
      .object({
        userAgent: z.string(),
        ipAddress: z.string(),
        deviceType: z.enum(['desktop', 'mobile', 'tablet']),
      })
      .optional(),
  }),
});

/**
 * Report schedule validation schema
 */
export const ReportScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  reportType: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z.record(z.unknown()),
  frequency: z.nativeEnum(ReportFrequency),
  schedule: z.object({
    minute: z.number().min(0).max(59).optional(),
    hour: z.number().min(0).max(23).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    month: z.number().min(1).max(12).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    timezone: z.string(),
  }),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        type: z.enum(['to', 'cc', 'bcc']),
      })
    )
    .min(1),
  deliveryOptions: z.object({
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    attachFile: z.boolean(),
    includeLink: z.boolean(),
    compress: z.boolean(),
    encrypt: z.boolean(),
  }),
  isActive: z.boolean(),
  agencyId: z.string().uuid(),
});

// ==================== API RESPONSE INTERFACES ====================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly metadata?: {
    readonly timestamp: Date;
    readonly requestId: string;
    readonly version: string;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
}

// ==================== SERVICE INTERFACES ====================

/**
 * Report service interface
 */
export interface IReportService {
  /**
   * Execute a report
   */
  executeReport(request: ReportExecutionRequest): Promise<ReportExecutionResult>;

  /**
   * Get report execution status
   */
  getReportStatus(executionId: string): Promise<ReportExecutionResult>;

  /**
   * Cancel report execution
   */
  cancelReportExecution(executionId: string): Promise<boolean>;

  /**
   * Get report templates
   */
  getReportTemplates(category?: ReportCategory): Promise<ReportTemplate[]>;

  /**
   * Get report template by type
   */
  getReportTemplate(reportType: ReportType): Promise<ReportTemplate | null>;

  /**
   * Get available report types
   */
  getAvailableReportTypes(permissions: string[]): Promise<ReportType[]>;

  /**
   * Validate report parameters
   */
  validateReportParameters(reportType: ReportType, parameters: Record<string, unknown>): Promise<boolean>;

  /**
   * Get report analytics
   */
  getReportAnalytics(agencyId: string, dateRange: { startDate: Date; endDate: Date }): Promise<ReportAnalytics>;
}

/**
 * Report scheduler service interface
 */
export interface IReportSchedulerService {
  /**
   * Create report schedule
   */
  createSchedule(
    schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'failureCount'>
  ): Promise<ReportSchedule>;

  /**
   * Update report schedule
   */
  updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<ReportSchedule>;

  /**
   * Delete report schedule
   */
  deleteSchedule(scheduleId: string): Promise<boolean>;

  /**
   * Get report schedules
   */
  getSchedules(agencyId: string): Promise<ReportSchedule[]>;

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): Promise<ReportSchedule | null>;

  /**
   * Execute scheduled report
   */
  executeScheduledReport(scheduleId: string): Promise<ReportExecutionResult>;

  /**
   * Pause/resume schedule
   */
  toggleSchedule(scheduleId: string, isActive: boolean): Promise<boolean>;
}

/**
 * Report export service interface
 */
export interface IReportExportService {
  /**
   * Export report to format
   */
  exportReport(reportData: ReportData, format: ReportFormat, options?: Record<string, unknown>): Promise<Blob>;

  /**
   * Get export capabilities
   */
  getExportCapabilities(format: ReportFormat): Promise<Record<string, boolean>>;

  /**
   * Convert between formats
   */
  convertFormat(sourceBlob: Blob, sourceFormat: ReportFormat, targetFormat: ReportFormat): Promise<Blob>;
}

/**
 * Report repository interface
 */
export interface IReportRepository {
  /**
   * Save report execution result
   */
  saveReportExecution(result: ReportExecutionResult): Promise<void>;

  /**
   * Get report execution history
   */
  getReportHistory(agencyId: string, filters?: Record<string, unknown>): Promise<ReportHistoryEntry[]>;

  /**
   * Get report by ID
   */
  getReportExecution(executionId: string): Promise<ReportExecutionResult | null>;

  /**
   * Delete report execution
   */
  deleteReportExecution(executionId: string): Promise<boolean>;

  /**
   * Clean up expired reports
   */
  cleanupExpiredReports(): Promise<number>;
}

// ==================== UTILITY TYPES ====================

/**
 * Report creation form data
 */
export type ReportCreateForm = Omit<ReportExecutionRequest, 'context'>;

/**
 * Report schedule creation form data
 */
export type ReportScheduleCreateForm = Omit<
  ReportSchedule,
  'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'failureCount' | 'lastExecutedAt' | 'nextExecutionAt'
>;

/**
 * Report filter options
 */
export type ReportFilterOptions = {
  readonly reportType?: ReportType;
  readonly status?: ReportStatus;
  readonly format?: ReportFormat;
  readonly dateRange?: {
    readonly startDate: Date;
    readonly endDate: Date;
  };
  readonly generatedBy?: string;
  readonly isScheduled?: boolean;
};

/**
 * Report sort options
 */
export type ReportSortOptions = {
  readonly field: 'generatedAt' | 'reportType' | 'status' | 'executionTime' | 'recordCount';
  readonly direction: 'asc' | 'desc';
};

/**
 * Report permission check
 */
export type ReportPermissionCheck = {
  readonly reportType: ReportType;
  readonly requiredPermissions: string[];
  readonly userPermissions: string[];
  readonly hasAccess: boolean;
  readonly missingPermissions: string[];
};

/**
 * Report business rules
 */
export const ReportBusinessRules = {
  // Execution limits
  MAX_CONCURRENT_REPORTS: 5,
  MAX_REPORT_EXECUTION_TIME: 300000, // 5 minutes in milliseconds
  MAX_REPORT_RETENTION_DAYS: 90,
  MAX_SCHEDULE_COUNT_PER_USER: 20,

  // Data limits
  MAX_RECORDS_FOR_EXCEL: 100000,
  MAX_RECORDS_FOR_PDF: 10000,
  MAX_RECORDS_FOR_CSV: 1000000,

  // File size limits (in bytes)
  MAX_FILE_SIZE_PDF: 52428800, // 50MB
  MAX_FILE_SIZE_EXCEL: 104857600, // 100MB
  MAX_FILE_SIZE_CSV: 524288000, // 500MB

  // Scheduling limits
  MIN_SCHEDULE_INTERVAL_MINUTES: 60,
  MAX_EMAIL_RECIPIENTS: 50,

  // Security
  REQUIRE_AUTHENTICATION: true,
  REQUIRE_AUTHORIZATION: true,
  ALLOW_ANONYMOUS_REPORTS: false,

  // Performance
  ENABLE_CACHING: true,
  CACHE_TTL_SECONDS: 3600, // 1 hour
  ENABLE_COMPRESSION: true,

  // Export settings
  DEFAULT_FORMAT: ReportFormat.PDF,
  WATERMARK_ENABLED: true,
  ENCRYPTION_ENABLED: true,
} as const;

/**
 * Report error codes
 */
export const ReportErrorCodes = {
  // Validation errors
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  MISSING_REQUIRED_PARAMETER: 'MISSING_REQUIRED_PARAMETER',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  REPORT_TYPE_NOT_ALLOWED: 'REPORT_TYPE_NOT_ALLOWED',
  FORMAT_NOT_SUPPORTED: 'FORMAT_NOT_SUPPORTED',

  // Execution errors
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  DATA_SOURCE_UNAVAILABLE: 'DATA_SOURCE_UNAVAILABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  GENERATION_FAILED: 'GENERATION_FAILED',

  // Resource errors
  CONCURRENT_LIMIT_EXCEEDED: 'CONCURRENT_LIMIT_EXCEEDED',
  FILE_SIZE_LIMIT_EXCEEDED: 'FILE_SIZE_LIMIT_EXCEEDED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

export type ReportErrorCode = (typeof ReportErrorCodes)[keyof typeof ReportErrorCodes];
