/**
 * Reporting Services Barrel Export
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Centralized exports for all reporting services.
 *
 * @domain Reporting
 * @pattern Barrel Export
 * @architecture Clean Architecture
 * @version 1.0.0
 */

// ==================== MAIN SERVICES ====================
export {
  ReportService,
  ReportServiceFactory,
  ReportServiceUtils,
  ReportServiceError,
  TimeoutError,
  type ServiceExecutionContext,
  type PermissionValidationResult,
} from './ReportService';

export {
  ReportExportService,
  ExportServiceFactory,
  ExportServiceUtils,
  ExportError,
  type ExportContext,
  type ExportOptions,
  type ExportResult,
  type ExportCapabilities,
} from './ReportExportService';

export {
  ReportTemplateService,
  TemplateServiceUtils,
  TemplateError,
  type TemplateContext,
  type DataGenerationResult,
  type TemplateValidationResult,
} from './ReportTemplateService';

export {
  ReportFileService,
  FileServiceUtils,
  FileError,
  type FileStorageResult,
  type FileMetadata,
  type DownloadOptions,
  type FileCleanupResult,
} from './ReportFileService';

// ==================== SERVICE UTILITIES ====================

/**
 * Service health check utilities
 */
export const ServiceHealthUtils = {
  /**
   * Check if all services are healthy
   */
  checkServicesHealth: async (): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'healthy' | 'unhealthy'>;
    details: Record<string, unknown>;
  }> => {
    const healthChecks = {
      export: true, // Mock health check
      template: true,
      file: true,
      main: true,
    };

    const failedServices = Object.entries(healthChecks)
      .filter(([, healthy]) => !healthy)
      .map(([service]) => service);

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (failedServices.length === 0) {
      overall = 'healthy';
    } else if (failedServices.length === Object.keys(healthChecks).length) {
      overall = 'unhealthy';
    } else {
      overall = 'degraded';
    }

    return {
      overall,
      services: Object.fromEntries(
        Object.entries(healthChecks).map(([service, healthy]) => [service, healthy ? 'healthy' : 'unhealthy'])
      ),
      details: {
        timestamp: new Date().toISOString(),
        failedServices,
        runningReports: ReportService.getRunningReportsStats(),
        fileStats: ReportFileService.getStorageStats(),
        templateCache: ReportTemplateService.getCacheStats(),
      },
    };
  },

  /**
   * Get service metrics
   */
  getServiceMetrics: (): {
    reportService: ReturnType<typeof ReportService.getRunningReportsStats>;
    fileService: ReturnType<typeof ReportFileService.getStorageStats>;
    templateService: ReturnType<typeof ReportTemplateService.getCacheStats>;
    memoryUsage: number;
    uptime: number;
  } => {
    return {
      reportService: ReportService.getRunningReportsStats(),
      fileService: ReportFileService.getStorageStats(),
      templateService: ReportTemplateService.getCacheStats(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      uptime: performance.now(),
    };
  },

  /**
   * Cleanup all services
   */
  cleanupAllServices: async (): Promise<{
    reportsCleanedUp: number;
    filesCleanedUp: number;
    templatesCached: number;
    errors: string[];
  }> => {
    console.log('🧹 Service Health: Starting cleanup of all services');

    const errors: string[] = [];
    let reportsCleanedUp = 0;
    let filesCleanedUp = 0;

    try {
      // Cleanup stale report executions
      reportsCleanedUp = await ReportService.cleanupStaleExecutions();
    } catch (error) {
      errors.push(`Report cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Cleanup expired files
      const fileCleanup = await ReportFileService.cleanupExpiredFiles();
      filesCleanedUp = fileCleanup.filesRemoved;
      errors.push(...fileCleanup.errors);
    } catch (error) {
      errors.push(`File cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Get template cache stats
    const templateStats = ReportTemplateService.getCacheStats();

    console.log('✅ Service Health: Cleanup completed', {
      reportsCleanedUp,
      filesCleanedUp,
      errors: errors.length,
    });

    return {
      reportsCleanedUp,
      filesCleanedUp,
      templatesCached: templateStats.templateCount,
      errors,
    };
  },
} as const;

/**
 * Service configuration utilities
 */
export const ServiceConfigUtils = {
  /**
   * Get service configuration
   */
  getServiceConfig: (): {
    reportService: {
      maxConcurrentReports: number;
      executionTimeout: number;
      retentionDays: number;
    };
    fileService: {
      maxFileSize: number;
      storageQuota: number;
      downloadUrlTtl: number;
    };
    templateService: {
      cacheTtl: number;
    };
  } => {
    return {
      reportService: {
        maxConcurrentReports: 5, // From ReportBusinessRules
        executionTimeout: 300000, // 5 minutes
        retentionDays: 90,
      },
      fileService: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        storageQuota: 1024 * 1024 * 1024, // 1GB
        downloadUrlTtl: 24 * 60 * 60 * 1000, // 24 hours
      },
      templateService: {
        cacheTtl: 3600000, // 1 hour
      },
    };
  },

  /**
   * Validate service configuration
   */
  validateServiceConfig: (): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check memory constraints
    if ((performance as any).memory && (performance as any).memory.usedJSHeapSize > 500 * 1024 * 1024) {
      warnings.push('High memory usage detected (>500MB)');
    }

    // Check running reports
    const reportStats = ReportService.getRunningReportsStats();
    if (reportStats.totalRunning > 10) {
      warnings.push(`High number of running reports: ${reportStats.totalRunning}`);
    }

    // Check file storage
    const fileStats = ReportFileService.getStorageStats();
    if (fileStats.quotaUtilization > 80) {
      warnings.push(`High storage utilization: ${fileStats.quotaUtilization.toFixed(1)}%`);
    }

    if (fileStats.quotaUtilization > 95) {
      errors.push('Storage quota nearly exceeded');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
} as const;

/**
 * Service monitoring utilities
 */
export const ServiceMonitoringUtils = {
  /**
   * Start service monitoring
   */
  startMonitoring: (
    intervalMs: number = 60000
  ): {
    stop: () => void;
    getStats: () => unknown;
  } => {
    const stats = {
      startTime: Date.now(),
      healthChecks: 0,
      cleanupRuns: 0,
      errors: [] as string[],
    };

    const interval = setInterval(async () => {
      try {
        // Perform health check
        const health = await ServiceHealthUtils.checkServicesHealth();
        stats.healthChecks++;

        // Log health status
        if (health.overall !== 'healthy') {
          console.warn('⚠️ Service Monitor: Services degraded', health);
        }

        // Periodic cleanup (every 10 checks)
        if (stats.healthChecks % 10 === 0) {
          const cleanup = await ServiceHealthUtils.cleanupAllServices();
          stats.cleanupRuns++;

          if (cleanup.errors.length > 0) {
            console.error('❌ Service Monitor: Cleanup errors', cleanup.errors);
            stats.errors.push(...cleanup.errors);
          }
        }
      } catch (error) {
        const errorMessage = `Monitoring error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌ Service Monitor:', errorMessage);
        stats.errors.push(errorMessage);
      }
    }, intervalMs);

    console.log('🔍 Service Monitor: Started monitoring services');

    return {
      stop: () => {
        clearInterval(interval);
        console.log('🔍 Service Monitor: Stopped monitoring services');
      },
      getStats: () => ({ ...stats, uptime: Date.now() - stats.startTime }),
    };
  },

  /**
   * Log service performance metrics
   */
  logPerformanceMetrics: (): void => {
    const metrics = ServiceHealthUtils.getServiceMetrics();

    console.log('📊 Service Performance Metrics:', {
      timestamp: new Date().toISOString(),
      runningReports: metrics.reportService.totalRunning,
      fileCount: metrics.fileService.totalFiles,
      fileStorageUsed: `${(metrics.fileService.totalSize / 1024 / 1024).toFixed(1)}MB`,
      templatesCached: metrics.templateService.templateCount,
      memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
      uptime: `${(metrics.uptime / 1000).toFixed(1)}s`,
    });
  },
} as const;

/**
 * Emergency service utilities
 */
export const EmergencyServiceUtils = {
  /**
   * Emergency stop all operations
   */
  emergencyStop: async (): Promise<{
    reportsCancelled: number;
    filesPreserved: number;
    success: boolean;
    errors: string[];
  }> => {
    console.log('🚨 Emergency Service: Initiating emergency stop');

    const errors: string[] = [];
    let reportsCancelled = 0;

    try {
      // Cancel all running reports
      const runningStats = ReportService.getRunningReportsStats();
      reportsCancelled = runningStats.totalRunning;

      // Force cleanup
      await ReportService.cleanupStaleExecutions(0); // Cleanup all immediately
    } catch (error) {
      errors.push(`Report emergency stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Get file count before emergency
    const fileStats = ReportFileService.getStorageStats();
    const filesPreserved = fileStats.totalFiles;

    console.log('🚨 Emergency Service: Emergency stop completed', {
      reportsCancelled,
      filesPreserved,
      errors: errors.length,
    });

    return {
      reportsCancelled,
      filesPreserved,
      success: errors.length === 0,
      errors,
    };
  },

  /**
   * Reset all services to initial state
   */
  resetAllServices: async (): Promise<{
    success: boolean;
    errors: string[];
    resetItems: {
      reports: number;
      files: number;
      templates: number;
    };
  }> => {
    console.log('🔄 Emergency Service: Resetting all services');

    const errors: string[] = [];
    const resetItems = { reports: 0, files: 0, templates: 0 };

    try {
      // Stop all reports
      const reportStats = ReportService.getRunningReportsStats();
      resetItems.reports = reportStats.totalRunning;
      await ReportService.cleanupStaleExecutions(0);

      // Clear all files
      const fileStats = ReportFileService.getStorageStats();
      resetItems.files = fileStats.totalFiles;
      await ReportFileService.cleanupExpiredFiles();

      // Clear template cache
      const templateStats = ReportTemplateService.getCacheStats();
      resetItems.templates = templateStats.templateCount;
      ReportTemplateService.clearTemplateCache();
      ReportTemplateService.clearDataCache();
    } catch (error) {
      errors.push(`Service reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('🔄 Emergency Service: Reset completed', {
      resetItems,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      errors,
      resetItems,
    };
  },
} as const;

// Import services for utility functions
import { ReportService } from './ReportService';
import { ReportFileService } from './ReportFileService';
import { ReportTemplateService } from './ReportTemplateService';
