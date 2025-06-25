/**
 * Report Domain Entity Tests
 *
 * Comprehensive unit tests for Report domain entity covering:
 * - Entity creation and validation
 * - Business logic methods
 * - Status transitions
 * - Error handling
 * - Edge cases and invariants
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import {
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  ReportFrequency,
  ReportConfiguration,
  ReportResult,
  ReportDomainError,
  InvalidReportConfigurationError,
  ReportNotExecutableError,
  ReportAlreadyExecutingError,
} from '../report';
import { ReportPeriod, ReportPeriodType } from '../../value-objects/report-period';

describe('Report Domain Entity', () => {
  const validReportProps = {
    agencyId: 'agency-123',
    title: 'Test Sales Report',
    description: 'A test sales report for unit testing',
    type: ReportType.SALES_SUMMARY,
    format: ReportFormat.PDF,
    frequency: ReportFrequency.ONE_TIME,
    period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
    configuration: {
      includeCharts: true,
      includeRawData: false,
      groupBy: 'day' as const,
      filters: { status: 'active' },
      sortBy: 'date',
      sortDirection: 'DESC' as const,
      limit: 1000,
    } as ReportConfiguration,
    createdBy: 'user-456',
    isPublic: false,
    tags: ['sales', 'monthly'],
  };

  const validResult: ReportResult = {
    data: { totalSales: 50000, orders: 100 },
    metadata: {
      recordCount: 100,
      executionTimeMs: 2500,
      generatedAt: new Date(),
      dataSourceVersion: '1.0.0',
    },
    fileUrl: 'https://example.com/report.pdf',
    fileSize: 1024000,
  };

  describe('Entity Creation', () => {
    it('should create a valid report with all required properties', () => {
      const report = Report.create(validReportProps);

      expect(report.id).toMatch(/^rpt_\d+_[a-z0-9]+$/);
      expect(report.agencyId).toBe(validReportProps.agencyId);
      expect(report.title).toBe(validReportProps.title);
      expect(report.description).toBe(validReportProps.description);
      expect(report.type).toBe(validReportProps.type);
      expect(report.status).toBe(ReportStatus.DRAFT);
      expect(report.format).toBe(validReportProps.format);
      expect(report.frequency).toBe(validReportProps.frequency);
      expect(report.period).toBe(validReportProps.period);
      expect(report.configuration).toEqual(validReportProps.configuration);
      expect(report.createdBy).toBe(validReportProps.createdBy);
      expect(report.isPublic).toBe(validReportProps.isPublic);
      expect(report.tags).toEqual(validReportProps.tags);
      expect(report.createdAt).toBeInstanceOf(Date);
      expect(report.updatedAt).toBeInstanceOf(Date);
      expect(report.result).toBeUndefined();
      expect(report.errorMessage).toBeUndefined();
    });

    it('should create report with minimal required properties', () => {
      const minimalProps = {
        agencyId: 'agency-123',
        title: 'Minimal Report',
        type: ReportType.SALES_SUMMARY,
        format: ReportFormat.PDF,
        frequency: ReportFrequency.ONE_TIME,
        period: ReportPeriod.fromType(ReportPeriodType.TODAY),
        configuration: {
          includeCharts: false,
          includeRawData: true,
        },
        createdBy: 'user-456',
        isPublic: false,
      };

      const report = Report.create(minimalProps);

      expect(report.description).toBeUndefined();
      expect(report.tags).toEqual([]);
      expect(report.status).toBe(ReportStatus.DRAFT);
    });

    it('should throw error for missing agency ID', () => {
      const invalidProps = { ...validReportProps, agencyId: '' };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Agency ID is required');
    });

    it('should throw error for missing title', () => {
      const invalidProps = { ...validReportProps, title: '' };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Report title is required');
    });

    it('should throw error for title exceeding 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      const invalidProps = { ...validReportProps, title: longTitle };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('cannot exceed 200 characters');
    });

    it('should throw error for missing created by', () => {
      const invalidProps = { ...validReportProps, createdBy: '' };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Created by user ID is required');
    });

    it('should throw error for invalid report type', () => {
      const invalidProps = { ...validReportProps, type: 'INVALID_TYPE' as ReportType };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Invalid report type');
    });

    it('should throw error for too many tags', () => {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const invalidProps = { ...validReportProps, tags: tooManyTags };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Cannot have more than 10 tags');
    });

    it('should throw error for tag exceeding 50 characters', () => {
      const longTag = 'A'.repeat(51);
      const invalidProps = { ...validReportProps, tags: [longTag] };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Tag length cannot exceed 50 characters');
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid limit', () => {
      const invalidConfig = { ...validReportProps.configuration, limit: 0 };
      const invalidProps = { ...validReportProps, configuration: invalidConfig };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Limit must be between 1 and 10000');
    });

    it('should throw error for limit exceeding maximum', () => {
      const invalidConfig = { ...validReportProps.configuration, limit: 10001 };
      const invalidProps = { ...validReportProps, configuration: invalidConfig };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Limit must be between 1 and 10000');
    });

    it('should throw error for invalid groupBy', () => {
      const invalidConfig = { ...validReportProps.configuration, groupBy: 'invalid' as any };
      const invalidProps = { ...validReportProps, configuration: invalidConfig };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Invalid groupBy value');
    });

    it('should throw error for invalid sort direction', () => {
      const invalidConfig = { ...validReportProps.configuration, sortDirection: 'INVALID' as any };
      const invalidProps = { ...validReportProps, configuration: invalidConfig };

      expect(() => Report.create(invalidProps)).toThrow(InvalidReportConfigurationError);
      expect(() => Report.create(invalidProps)).toThrow('Sort direction must be ASC or DESC');
    });
  });

  describe('Business Logic Methods', () => {
    let report: Report;

    beforeEach(() => {
      report = Report.create(validReportProps);
    });

    describe('canExecute()', () => {
      it('should return true for DRAFT status', () => {
        expect(report.canExecute()).toBe(true);
      });

      it('should return true for SCHEDULED status', () => {
        const scheduledReport = report.schedule(new Date(Date.now() + 60000), 'user-123');
        expect(scheduledReport.canExecute()).toBe(true);
      });

      it('should return true for FAILED status', () => {
        const runningReport = report.startExecution('user-123');
        const failedReport = runningReport.failExecution('Test error', 'user-123');
        expect(failedReport.canExecute()).toBe(true);
      });

      it('should return false for RUNNING status', () => {
        const runningReport = report.startExecution('user-123');
        expect(runningReport.canExecute()).toBe(false);
      });

      it('should return false for COMPLETED status', () => {
        const runningReport = report.startExecution('user-123');
        const completedReport = runningReport.completeExecution(validResult, 'user-123');
        expect(completedReport.canExecute()).toBe(false);
      });
    });

    describe('canCancel()', () => {
      it('should return false for DRAFT status', () => {
        expect(report.canCancel()).toBe(false);
      });

      it('should return true for SCHEDULED status', () => {
        const scheduledReport = report.schedule(new Date(Date.now() + 60000), 'user-123');
        expect(scheduledReport.canCancel()).toBe(true);
      });

      it('should return true for RUNNING status', () => {
        const runningReport = report.startExecution('user-123');
        expect(runningReport.canCancel()).toBe(true);
      });
    });

    describe('canEdit()', () => {
      it('should return true for DRAFT status', () => {
        expect(report.canEdit()).toBe(true);
      });

      it('should return true for FAILED status', () => {
        const runningReport = report.startExecution('user-123');
        const failedReport = runningReport.failExecution('Test error', 'user-123');
        expect(failedReport.canEdit()).toBe(true);
      });

      it('should return false for RUNNING status', () => {
        const runningReport = report.startExecution('user-123');
        expect(runningReport.canEdit()).toBe(false);
      });

      it('should return false for COMPLETED status', () => {
        const runningReport = report.startExecution('user-123');
        const completedReport = runningReport.completeExecution(validResult, 'user-123');
        expect(completedReport.canEdit()).toBe(false);
      });
    });

    describe('isRecurring()', () => {
      it('should return false for ONE_TIME frequency', () => {
        expect(report.isRecurring()).toBe(false);
      });

      it('should return true for DAILY frequency', () => {
        const recurringProps = { ...validReportProps, frequency: ReportFrequency.DAILY };
        const recurringReport = Report.create(recurringProps);
        expect(recurringReport.isRecurring()).toBe(true);
      });
    });
  });

  describe('Status Transitions', () => {
    let report: Report;

    beforeEach(() => {
      report = Report.create(validReportProps);
    });

    describe('schedule()', () => {
      it('should schedule a draft report', () => {
        const scheduledAt = new Date(Date.now() + 60000);
        const scheduledReport = report.schedule(scheduledAt, 'user-123');

        expect(scheduledReport.status).toBe(ReportStatus.SCHEDULED);
        expect(scheduledReport.scheduledAt).toEqual(scheduledAt);
        expect(scheduledReport.updatedAt.getTime()).toBeGreaterThan(report.updatedAt.getTime());
      });

      it('should throw error when scheduling in past', () => {
        const pastDate = new Date(Date.now() - 60000);

        expect(() => report.schedule(pastDate, 'user-123')).toThrow(InvalidReportConfigurationError);
        expect(() => report.schedule(pastDate, 'user-123')).toThrow('must be in the future');
      });

      it('should throw error when report cannot be executed', () => {
        const runningReport = report.startExecution('user-123');
        const futureDate = new Date(Date.now() + 60000);

        expect(() => runningReport.schedule(futureDate, 'user-123')).toThrow(ReportNotExecutableError);
      });
    });

    describe('startExecution()', () => {
      it('should start execution of draft report', () => {
        const executingReport = report.startExecution('user-123');

        expect(executingReport.status).toBe(ReportStatus.RUNNING);
        expect(executingReport.executedAt).toBeInstanceOf(Date);
        expect(executingReport.errorMessage).toBeUndefined();
      });

      it('should start execution of scheduled report', () => {
        const scheduledAt = new Date(Date.now() + 60000);
        const scheduledReport = report.schedule(scheduledAt, 'user-123');
        const executingReport = scheduledReport.startExecution('user-123');

        expect(executingReport.status).toBe(ReportStatus.RUNNING);
        expect(executingReport.executedAt).toBeInstanceOf(Date);
      });

      it('should throw error when report cannot be executed', () => {
        const runningReport = report.startExecution('user-123');

        expect(() => runningReport.startExecution('user-123')).toThrow(ReportNotExecutableError);
      });
    });

    describe('completeExecution()', () => {
      it('should complete running report with results', () => {
        const runningReport = report.startExecution('user-123');
        const completedReport = runningReport.completeExecution(validResult, 'user-123');

        expect(completedReport.status).toBe(ReportStatus.COMPLETED);
        expect(completedReport.result).toEqual(validResult);
        expect(completedReport.completedAt).toBeInstanceOf(Date);
        expect(completedReport.errorMessage).toBeUndefined();
      });

      it('should throw error when report is not running', () => {
        expect(() => report.completeExecution(validResult, 'user-123')).toThrow(ReportDomainError);
        expect(() => report.completeExecution(validResult, 'user-123')).toThrow('Can only complete running reports');
      });
    });

    describe('failExecution()', () => {
      it('should fail running report with error message', () => {
        const runningReport = report.startExecution('user-123');
        const failedReport = runningReport.failExecution('Database connection failed', 'user-123');

        expect(failedReport.status).toBe(ReportStatus.FAILED);
        expect(failedReport.errorMessage).toBe('Database connection failed');
        expect(failedReport.completedAt).toBeInstanceOf(Date);
      });

      it('should throw error when report is not running', () => {
        expect(() => report.failExecution('Error', 'user-123')).toThrow(ReportDomainError);
        expect(() => report.failExecution('Error', 'user-123')).toThrow('Can only fail running reports');
      });
    });

    describe('cancel()', () => {
      it('should cancel scheduled report', () => {
        const scheduledAt = new Date(Date.now() + 60000);
        const scheduledReport = report.schedule(scheduledAt, 'user-123');
        const cancelledReport = scheduledReport.cancel('user-123');

        expect(cancelledReport.status).toBe(ReportStatus.CANCELLED);
      });

      it('should cancel running report', () => {
        const runningReport = report.startExecution('user-123');
        const cancelledReport = runningReport.cancel('user-123');

        expect(cancelledReport.status).toBe(ReportStatus.CANCELLED);
      });

      it('should throw error when report cannot be cancelled', () => {
        expect(() => report.cancel('user-123')).toThrow(ReportDomainError);
        expect(() => report.cancel('user-123')).toThrow('Cannot cancel report in DRAFT status');
      });
    });
  });

  describe('Configuration Updates', () => {
    let report: Report;

    beforeEach(() => {
      report = Report.create(validReportProps);
    });

    it('should update report title', () => {
      const updatedReport = report.updateConfiguration({ title: 'New Title' }, 'user-123');

      expect(updatedReport.title).toBe('New Title');
      expect(updatedReport.updatedAt.getTime()).toBeGreaterThan(report.updatedAt.getTime());
    });

    it('should update report description', () => {
      const updatedReport = report.updateConfiguration({ description: 'New description' }, 'user-123');

      expect(updatedReport.description).toBe('New description');
    });

    it('should update report configuration', () => {
      const newConfig: ReportConfiguration = {
        includeCharts: false,
        includeRawData: true,
        limit: 500,
      };
      const updatedReport = report.updateConfiguration({ configuration: newConfig }, 'user-123');

      expect(updatedReport.configuration).toEqual(newConfig);
    });

    it('should throw error when updating non-editable report', () => {
      const runningReport = report.startExecution('user-123');

      expect(() => runningReport.updateConfiguration({ title: 'New Title' }, 'user-123')).toThrow(ReportDomainError);
    });

    it('should throw error for invalid title update', () => {
      expect(() => report.updateConfiguration({ title: '' }, 'user-123')).toThrow(InvalidReportConfigurationError);
    });
  });

  describe('Public Access Management', () => {
    let report: Report;

    beforeEach(() => {
      report = Report.create(validReportProps);
    });

    it('should toggle public access to true', () => {
      const publicReport = report.togglePublicAccess(true, 'user-123');

      expect(publicReport.isPublic).toBe(true);
    });

    it('should toggle public access to false and remove share token', () => {
      const publicReport = report.togglePublicAccess(true, 'user-123');
      const tokenReport = publicReport.generateShareToken('user-123');
      const privateReport = tokenReport.togglePublicAccess(false, 'user-123');

      expect(privateReport.isPublic).toBe(false);
      expect(privateReport.shareToken).toBeUndefined();
    });

    it('should generate share token for public report', () => {
      const publicReport = report.togglePublicAccess(true, 'user-123');
      const tokenReport = publicReport.generateShareToken('user-123');

      expect(tokenReport.shareToken).toMatch(/^share_\d+_[a-z0-9]+$/);
    });

    it('should throw error when generating share token for private report', () => {
      expect(() => report.generateShareToken('user-123')).toThrow(ReportDomainError);
      expect(() => report.generateShareToken('user-123')).toThrow('Cannot generate share token for private report');
    });
  });

  describe('Execution Time Estimation', () => {
    it('should calculate estimated execution time', () => {
      const report = Report.create(validReportProps);
      const estimatedTime = report.getEstimatedExecutionTimeMs();

      expect(estimatedTime).toBeGreaterThan(0);
      expect(typeof estimatedTime).toBe('number');
    });

    it('should vary estimation based on report type', () => {
      const salesReport = Report.create({ ...validReportProps, type: ReportType.SALES_SUMMARY });
      const executiveReport = Report.create({ ...validReportProps, type: ReportType.EXECUTIVE_DASHBOARD });

      const salesTime = salesReport.getEstimatedExecutionTimeMs();
      const executiveTime = executiveReport.getEstimatedExecutionTimeMs();

      expect(executiveTime).toBeGreaterThan(salesTime);
    });

    it('should increase estimation for longer periods', () => {
      const shortPeriodReport = Report.create({
        ...validReportProps,
        period: ReportPeriod.fromType(ReportPeriodType.TODAY),
      });
      const longPeriodReport = Report.create({
        ...validReportProps,
        period: ReportPeriod.fromType(ReportPeriodType.LAST_YEAR),
      });

      const shortTime = shortPeriodReport.getEstimatedExecutionTimeMs();
      const longTime = longPeriodReport.getEstimatedExecutionTimeMs();

      expect(longTime).toBeGreaterThan(shortTime);
    });
  });

  describe('Scheduled Execution Check', () => {
    it('should detect when recurring report needs execution', () => {
      const pastTime = new Date(Date.now() - 60000);
      const recurringProps = { ...validReportProps, frequency: ReportFrequency.DAILY };
      const report = Report.create(recurringProps);
      const scheduledReport = report.schedule(pastTime, 'user-123');

      expect(scheduledReport.needsExecution()).toBe(true);
    });

    it('should return false when scheduled time is in future', () => {
      const futureTime = new Date(Date.now() + 60000);
      const recurringProps = { ...validReportProps, frequency: ReportFrequency.DAILY };
      const report = Report.create(recurringProps);
      const scheduledReport = report.schedule(futureTime, 'user-123');

      expect(scheduledReport.needsExecution()).toBe(false);
    });

    it('should return false for one-time reports', () => {
      const pastTime = new Date(Date.now() - 60000);
      const report = Report.create(validReportProps);
      const scheduledReport = report.schedule(pastTime, 'user-123');

      expect(scheduledReport.needsExecution()).toBe(false);
    });
  });

  describe('Entity Equality and Serialization', () => {
    it('should compare entities by ID', () => {
      const report1 = Report.create(validReportProps);
      const report2 = Report.create(validReportProps);

      expect(report1.equals(report2)).toBe(false);
      expect(report1.equals(report1)).toBe(true);
    });

    it('should convert to persistence format', () => {
      const report = Report.create(validReportProps);
      const persistence = report.toPersistence();

      expect(persistence.id).toBe(report.id);
      expect(persistence.createdAt).toBeInstanceOf(Date);
      expect(persistence.updatedAt).toBeInstanceOf(Date);
    });

    it('should provide meaningful string representation', () => {
      const report = Report.create(validReportProps);
      const str = report.toString();

      expect(str).toContain(report.id);
      expect(str).toContain(report.title);
      expect(str).toContain(report.status);
    });
  });

  describe('Reconstitution from Persistence', () => {
    it('should reconstitute report from persistence data', () => {
      const originalReport = Report.create(validReportProps);
      const persistenceData = originalReport.toPersistence();
      const reconstitutedReport = Report.fromPersistence(persistenceData);

      expect(reconstitutedReport.id).toBe(originalReport.id);
      expect(reconstitutedReport.title).toBe(originalReport.title);
      expect(reconstitutedReport.status).toBe(originalReport.status);
    });
  });

  describe('Immutability', () => {
    it('should return new instances for state changes', () => {
      const originalReport = Report.create(validReportProps);
      const scheduledReport = originalReport.schedule(new Date(Date.now() + 60000), 'user-123');

      expect(scheduledReport).not.toBe(originalReport);
      expect(originalReport.status).toBe(ReportStatus.DRAFT);
      expect(scheduledReport.status).toBe(ReportStatus.SCHEDULED);
    });

    it('should return defensive copies of mutable properties', () => {
      const report = Report.create(validReportProps);
      const config1 = report.configuration;
      const config2 = report.configuration;

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
