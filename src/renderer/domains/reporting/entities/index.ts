/**
 * Entities Barrel Export
 *
 * Following Instructions standards with clean exports.
 * Centralizes all exports from the entities directory.
 *
 * @module Entities
 * @version 1.0.0
 */

// ==================== REPORT ENTITY ====================
export {
  Report,
  ReportFactory,
  ReportUtils,
  type ReportId,
  type CreateReportData,
  type ReportMetadata,
  type ReportError,
  type ReportProgress,
} from './Report';

// ==================== SCHEDULED REPORT ENTITY ====================
export {
  ScheduledReport,
  ScheduledReportFactory,
  ScheduledReportUtils,
  type ScheduledReportId,
  type CreateScheduledReportData,
  type ScheduledReportMetadata,
  type ExecutionHistory,
} from './ScheduledReport';
