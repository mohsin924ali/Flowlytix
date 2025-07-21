/**
 * Report Status Value Object
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Defines report execution and lifecycle status.
 *
 * @domain Reporting
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

/**
 * Report execution status enumeration
 */
export enum ReportStatus {
  // Pre-execution states
  PENDING = 'pending', // Queued for execution
  VALIDATING = 'validating', // Validating parameters and permissions

  // Execution states
  RUNNING = 'running', // Currently generating
  PROCESSING = 'processing', // Data processing stage
  RENDERING = 'rendering', // Report formatting stage

  // Completion states
  COMPLETED = 'completed', // Successfully generated
  FAILED = 'failed', // Generation failed
  CANCELLED = 'cancelled', // User cancelled
  TIMEOUT = 'timeout', // Execution timeout

  // Schedule states
  SCHEDULED = 'scheduled', // Scheduled for future execution
  PAUSED = 'paused', // Scheduled execution paused

  // Export states
  EXPORTING = 'exporting', // Converting to export format
  EXPORTED = 'exported', // Successfully exported
  EXPORT_FAILED = 'export_failed', // Export conversion failed
}

/**
 * Report status metadata interface
 */
export interface ReportStatusMetadata {
  readonly status: ReportStatus;
  readonly displayName: string;
  readonly description: string;
  readonly isTerminal: boolean; // Cannot transition to other states
  readonly isError: boolean; // Indicates error condition
  readonly allowRetry: boolean; // Can be retried after this state
  readonly progressIndicator: boolean; // Should show progress indicator
  readonly nextStates: ReportStatus[]; // Valid next states
  readonly userAction?: string; // Suggested user action
}

/**
 * Report Status Value Object Class
 * Provides comprehensive status management and validation
 */
export class ReportStatusValue {
  private static readonly STATUS_METADATA: Record<ReportStatus, ReportStatusMetadata> = {
    [ReportStatus.PENDING]: {
      status: ReportStatus.PENDING,
      displayName: 'Pending',
      description: 'Report is queued for execution',
      isTerminal: false,
      isError: false,
      allowRetry: true,
      progressIndicator: true,
      nextStates: [ReportStatus.VALIDATING, ReportStatus.RUNNING, ReportStatus.CANCELLED],
      userAction: 'Please wait while your report is queued',
    },
    [ReportStatus.VALIDATING]: {
      status: ReportStatus.VALIDATING,
      displayName: 'Validating',
      description: 'Validating parameters and permissions',
      isTerminal: false,
      isError: false,
      allowRetry: true,
      progressIndicator: true,
      nextStates: [ReportStatus.RUNNING, ReportStatus.FAILED, ReportStatus.CANCELLED],
      userAction: 'Validating report parameters',
    },
    [ReportStatus.RUNNING]: {
      status: ReportStatus.RUNNING,
      displayName: 'Running',
      description: 'Report generation in progress',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: true,
      nextStates: [
        ReportStatus.PROCESSING,
        ReportStatus.COMPLETED,
        ReportStatus.FAILED,
        ReportStatus.TIMEOUT,
        ReportStatus.CANCELLED,
      ],
      userAction: 'Generating your report',
    },
    [ReportStatus.PROCESSING]: {
      status: ReportStatus.PROCESSING,
      displayName: 'Processing',
      description: 'Processing data for report generation',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: true,
      nextStates: [
        ReportStatus.RENDERING,
        ReportStatus.COMPLETED,
        ReportStatus.FAILED,
        ReportStatus.TIMEOUT,
        ReportStatus.CANCELLED,
      ],
      userAction: 'Processing report data',
    },
    [ReportStatus.RENDERING]: {
      status: ReportStatus.RENDERING,
      displayName: 'Rendering',
      description: 'Formatting and rendering report',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: true,
      nextStates: [ReportStatus.COMPLETED, ReportStatus.EXPORTING, ReportStatus.FAILED, ReportStatus.TIMEOUT],
      userAction: 'Formatting your report',
    },
    [ReportStatus.COMPLETED]: {
      status: ReportStatus.COMPLETED,
      displayName: 'Completed',
      description: 'Report generated successfully',
      isTerminal: true,
      isError: false,
      allowRetry: false,
      progressIndicator: false,
      nextStates: [ReportStatus.EXPORTING],
      userAction: 'Your report is ready for viewing',
    },
    [ReportStatus.FAILED]: {
      status: ReportStatus.FAILED,
      displayName: 'Failed',
      description: 'Report generation failed',
      isTerminal: true,
      isError: true,
      allowRetry: true,
      progressIndicator: false,
      nextStates: [ReportStatus.PENDING],
      userAction: 'Please try again or contact support',
    },
    [ReportStatus.CANCELLED]: {
      status: ReportStatus.CANCELLED,
      displayName: 'Cancelled',
      description: 'Report generation was cancelled',
      isTerminal: true,
      isError: false,
      allowRetry: true,
      progressIndicator: false,
      nextStates: [ReportStatus.PENDING],
      userAction: 'You can restart the report generation',
    },
    [ReportStatus.TIMEOUT]: {
      status: ReportStatus.TIMEOUT,
      displayName: 'Timeout',
      description: 'Report generation timed out',
      isTerminal: true,
      isError: true,
      allowRetry: true,
      progressIndicator: false,
      nextStates: [ReportStatus.PENDING],
      userAction: 'Try with a smaller date range or fewer parameters',
    },
    [ReportStatus.SCHEDULED]: {
      status: ReportStatus.SCHEDULED,
      displayName: 'Scheduled',
      description: 'Report scheduled for future execution',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: false,
      nextStates: [ReportStatus.PENDING, ReportStatus.PAUSED, ReportStatus.CANCELLED],
      userAction: 'Report will run automatically at scheduled time',
    },
    [ReportStatus.PAUSED]: {
      status: ReportStatus.PAUSED,
      displayName: 'Paused',
      description: 'Scheduled execution is paused',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: false,
      nextStates: [ReportStatus.SCHEDULED, ReportStatus.CANCELLED],
      userAction: 'Resume or cancel the scheduled report',
    },
    [ReportStatus.EXPORTING]: {
      status: ReportStatus.EXPORTING,
      displayName: 'Exporting',
      description: 'Converting report to export format',
      isTerminal: false,
      isError: false,
      allowRetry: false,
      progressIndicator: true,
      nextStates: [ReportStatus.EXPORTED, ReportStatus.EXPORT_FAILED],
      userAction: 'Preparing your export file',
    },
    [ReportStatus.EXPORTED]: {
      status: ReportStatus.EXPORTED,
      displayName: 'Exported',
      description: 'Report exported successfully',
      isTerminal: true,
      isError: false,
      allowRetry: false,
      progressIndicator: false,
      nextStates: [],
      userAction: 'Your export file is ready for download',
    },
    [ReportStatus.EXPORT_FAILED]: {
      status: ReportStatus.EXPORT_FAILED,
      displayName: 'Export Failed',
      description: 'Report export failed',
      isTerminal: true,
      isError: true,
      allowRetry: true,
      progressIndicator: false,
      nextStates: [ReportStatus.EXPORTING],
      userAction: 'Try exporting again or use a different format',
    },
  };

  private constructor(private readonly status: ReportStatus) {}

  /**
   * Create ReportStatusValue from enum
   */
  static from(status: ReportStatus): ReportStatusValue {
    return new ReportStatusValue(status);
  }

  /**
   * Get status metadata
   */
  getMetadata(): ReportStatusMetadata {
    const metadata = ReportStatusValue.STATUS_METADATA[this.status];
    if (!metadata) {
      throw new Error(`Unknown report status: ${this.status}`);
    }
    return metadata;
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return this.getMetadata().displayName;
  }

  /**
   * Get description
   */
  getDescription(): string {
    return this.getMetadata().description;
  }

  /**
   * Check if status is terminal (no further transitions)
   */
  isTerminal(): boolean {
    return this.getMetadata().isTerminal;
  }

  /**
   * Check if status indicates an error
   */
  isError(): boolean {
    return this.getMetadata().isError;
  }

  /**
   * Check if operation can be retried from this status
   */
  canRetry(): boolean {
    return this.getMetadata().allowRetry;
  }

  /**
   * Check if should show progress indicator
   */
  shouldShowProgress(): boolean {
    return this.getMetadata().progressIndicator;
  }

  /**
   * Get valid next states
   */
  getValidNextStates(): ReportStatus[] {
    return this.getMetadata().nextStates;
  }

  /**
   * Get user action message
   */
  getUserAction(): string | undefined {
    return this.getMetadata().userAction;
  }

  /**
   * Check if transition to new status is valid
   */
  canTransitionTo(newStatus: ReportStatus): boolean {
    return this.getValidNextStates().includes(newStatus);
  }

  /**
   * Validate state transition
   */
  validateTransition(newStatus: ReportStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid state transition from ${this.status} to ${newStatus}. Valid transitions: ${this.getValidNextStates().join(', ')}`
      );
    }
  }

  /**
   * Get status as string
   */
  toString(): string {
    return this.status;
  }

  /**
   * Check equality
   */
  equals(other: ReportStatusValue): boolean {
    return this.status === other.status;
  }

  /**
   * Check if status is in progress
   */
  isInProgress(): boolean {
    const progressStates = [
      ReportStatus.PENDING,
      ReportStatus.VALIDATING,
      ReportStatus.RUNNING,
      ReportStatus.PROCESSING,
      ReportStatus.RENDERING,
      ReportStatus.EXPORTING,
    ];
    return progressStates.includes(this.status);
  }

  /**
   * Check if status is successful completion
   */
  isSuccess(): boolean {
    return this.status === ReportStatus.COMPLETED || this.status === ReportStatus.EXPORTED;
  }

  /**
   * Check if status allows user interaction
   */
  allowsUserInteraction(): boolean {
    const interactiveStates = [
      ReportStatus.COMPLETED,
      ReportStatus.FAILED,
      ReportStatus.CANCELLED,
      ReportStatus.TIMEOUT,
      ReportStatus.SCHEDULED,
      ReportStatus.PAUSED,
      ReportStatus.EXPORTED,
      ReportStatus.EXPORT_FAILED,
    ];
    return interactiveStates.includes(this.status);
  }

  /**
   * Get all available statuses
   */
  static getAllStatuses(): ReportStatus[] {
    return Object.values(ReportStatus);
  }

  /**
   * Get error statuses
   */
  static getErrorStatuses(): ReportStatus[] {
    return Object.values(ReportStatus).filter((status) => {
      const metadata = ReportStatusValue.STATUS_METADATA[status];
      return metadata && metadata.isError;
    });
  }

  /**
   * Get terminal statuses
   */
  static getTerminalStatuses(): ReportStatus[] {
    return Object.values(ReportStatus).filter((status) => {
      const metadata = ReportStatusValue.STATUS_METADATA[status];
      return metadata && metadata.isTerminal;
    });
  }

  /**
   * Get progress statuses
   */
  static getProgressStatuses(): ReportStatus[] {
    return Object.values(ReportStatus).filter((status) => {
      const metadata = ReportStatusValue.STATUS_METADATA[status];
      return metadata && metadata.progressIndicator;
    });
  }
}

/**
 * Report status utilities
 */
export const ReportStatusUtils = {
  /**
   * Get status color for UI components
   */
  getStatusColor: (status: ReportStatus): string => {
    const colors: Record<ReportStatus, string> = {
      [ReportStatus.PENDING]: 'info',
      [ReportStatus.VALIDATING]: 'info',
      [ReportStatus.RUNNING]: 'primary',
      [ReportStatus.PROCESSING]: 'primary',
      [ReportStatus.RENDERING]: 'primary',
      [ReportStatus.COMPLETED]: 'success',
      [ReportStatus.FAILED]: 'error',
      [ReportStatus.CANCELLED]: 'warning',
      [ReportStatus.TIMEOUT]: 'error',
      [ReportStatus.SCHEDULED]: 'info',
      [ReportStatus.PAUSED]: 'warning',
      [ReportStatus.EXPORTING]: 'primary',
      [ReportStatus.EXPORTED]: 'success',
      [ReportStatus.EXPORT_FAILED]: 'error',
    };
    return colors[status] || 'default';
  },

  /**
   * Get status icon for UI components
   */
  getStatusIcon: (status: ReportStatus): string => {
    const icons: Record<ReportStatus, string> = {
      [ReportStatus.PENDING]: 'hourglass_empty',
      [ReportStatus.VALIDATING]: 'check_circle_outline',
      [ReportStatus.RUNNING]: 'play_circle_outline',
      [ReportStatus.PROCESSING]: 'settings',
      [ReportStatus.RENDERING]: 'brush',
      [ReportStatus.COMPLETED]: 'check_circle',
      [ReportStatus.FAILED]: 'error',
      [ReportStatus.CANCELLED]: 'cancel',
      [ReportStatus.TIMEOUT]: 'timer_off',
      [ReportStatus.SCHEDULED]: 'schedule',
      [ReportStatus.PAUSED]: 'pause_circle',
      [ReportStatus.EXPORTING]: 'file_download',
      [ReportStatus.EXPORTED]: 'download_done',
      [ReportStatus.EXPORT_FAILED]: 'error_outline',
    };
    return icons[status] || 'help_outline';
  },

  /**
   * Calculate progress percentage for status
   */
  getProgressPercentage: (status: ReportStatus): number => {
    const progressMap: Record<ReportStatus, number> = {
      [ReportStatus.PENDING]: 0,
      [ReportStatus.VALIDATING]: 10,
      [ReportStatus.RUNNING]: 25,
      [ReportStatus.PROCESSING]: 50,
      [ReportStatus.RENDERING]: 75,
      [ReportStatus.COMPLETED]: 100,
      [ReportStatus.EXPORTING]: 90,
      [ReportStatus.EXPORTED]: 100,
      [ReportStatus.FAILED]: 0,
      [ReportStatus.CANCELLED]: 0,
      [ReportStatus.TIMEOUT]: 0,
      [ReportStatus.SCHEDULED]: 0,
      [ReportStatus.PAUSED]: 0,
      [ReportStatus.EXPORT_FAILED]: 0,
    };
    return progressMap[status] || 0;
  },

  /**
   * Check if status is actionable by user
   */
  isActionable: (status: ReportStatus): boolean => {
    const actionableStates = [
      ReportStatus.FAILED,
      ReportStatus.CANCELLED,
      ReportStatus.TIMEOUT,
      ReportStatus.COMPLETED,
      ReportStatus.SCHEDULED,
      ReportStatus.PAUSED,
      ReportStatus.EXPORTED,
      ReportStatus.EXPORT_FAILED,
    ];
    return actionableStates.includes(status);
  },

  /**
   * Get next likely status transitions
   */
  getNextLikelyStatus: (currentStatus: ReportStatus): ReportStatus | null => {
    const nextStatusMap: Record<ReportStatus, ReportStatus | null> = {
      [ReportStatus.PENDING]: ReportStatus.VALIDATING,
      [ReportStatus.VALIDATING]: ReportStatus.RUNNING,
      [ReportStatus.RUNNING]: ReportStatus.PROCESSING,
      [ReportStatus.PROCESSING]: ReportStatus.RENDERING,
      [ReportStatus.RENDERING]: ReportStatus.COMPLETED,
      [ReportStatus.COMPLETED]: null,
      [ReportStatus.SCHEDULED]: ReportStatus.PENDING,
      [ReportStatus.EXPORTING]: ReportStatus.EXPORTED,
      [ReportStatus.EXPORTED]: null,
      [ReportStatus.FAILED]: null,
      [ReportStatus.CANCELLED]: null,
      [ReportStatus.TIMEOUT]: null,
      [ReportStatus.PAUSED]: null,
      [ReportStatus.EXPORT_FAILED]: null,
    };
    return nextStatusMap[currentStatus] || null;
  },

  /**
   * Validate status string
   */
  isValidStatus: (status: string): status is ReportStatus => {
    return Object.values(ReportStatus).includes(status as ReportStatus);
  },
} as const;
