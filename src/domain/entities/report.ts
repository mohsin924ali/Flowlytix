/**
 * Report Domain Entity
 *
 * Represents a business report with metadata, configuration, and business logic.
 * Handles different report types, execution status, and result management.
 *
 * @domain Reports and Analytics
 * @pattern Domain Entity
 * @version 1.0.0
 */

import { ReportPeriod, ReportPeriodType } from '../value-objects/report-period';

/**
 * Report type enumeration
 */
export enum ReportType {
  SALES_SUMMARY = 'SALES_SUMMARY',
  CUSTOMER_ANALYTICS = 'CUSTOMER_ANALYTICS',
  PRODUCT_PERFORMANCE = 'PRODUCT_PERFORMANCE',
  INVENTORY_STATUS = 'INVENTORY_STATUS',
  PAYMENT_AGING = 'PAYMENT_AGING',
  SHIPPING_ANALYTICS = 'SHIPPING_ANALYTICS',
  ORDER_FULFILLMENT = 'ORDER_FULFILLMENT',
  FINANCIAL_SUMMARY = 'FINANCIAL_SUMMARY',
  OPERATIONAL_METRICS = 'OPERATIONAL_METRICS',
  EXECUTIVE_DASHBOARD = 'EXECUTIVE_DASHBOARD',
}

/**
 * Report status enumeration
 */
export enum ReportStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Report format enumeration
 */
export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  HTML = 'HTML',
}

/**
 * Report frequency enumeration
 */
export enum ReportFrequency {
  ONE_TIME = 'ONE_TIME',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Report configuration interface
 */
export interface ReportConfiguration {
  readonly includeCharts: boolean;
  readonly includeRawData: boolean;
  readonly groupBy?: 'day' | 'week' | 'month' | 'quarter';
  readonly filters?: Record<string, any>;
  readonly sortBy?: string;
  readonly sortDirection?: 'ASC' | 'DESC';
  readonly limit?: number;
  readonly customFields?: string[];
}

/**
 * Report result interface
 */
export interface ReportResult {
  readonly data: any;
  readonly metadata: {
    readonly recordCount: number;
    readonly executionTimeMs: number;
    readonly generatedAt: Date;
    readonly dataSourceVersion: string;
  };
  readonly fileUrl?: string;
  readonly fileSize?: number;
}

/**
 * Report entity properties
 */
export interface ReportProps {
  readonly id: string;
  readonly agencyId: string;
  readonly title: string;
  readonly description?: string;
  readonly type: ReportType;
  readonly status: ReportStatus;
  readonly format: ReportFormat;
  readonly frequency: ReportFrequency;
  readonly period: ReportPeriod;
  readonly configuration: ReportConfiguration;
  readonly result?: ReportResult;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly scheduledAt?: Date;
  readonly executedAt?: Date;
  readonly completedAt?: Date;
  readonly errorMessage?: string;
  readonly tags?: string[];
  readonly isPublic: boolean;
  readonly shareToken?: string;
}

/**
 * Report domain errors
 */
export class ReportDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ReportDomainError';
  }
}

export class InvalidReportConfigurationError extends ReportDomainError {
  constructor(message: string) {
    super(message, 'INVALID_CONFIGURATION');
  }
}

export class ReportNotExecutableError extends ReportDomainError {
  constructor(message: string) {
    super(message, 'NOT_EXECUTABLE');
  }
}

export class ReportAlreadyExecutingError extends ReportDomainError {
  constructor(message: string) {
    super(message, 'ALREADY_EXECUTING');
  }
}

/**
 * Report domain entity
 */
export class Report {
  private constructor(private readonly props: ReportProps) {
    this.validateInvariants();
  }

  /**
   * Create a new report
   */
  static create(props: Omit<ReportProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Report {
    const now = new Date();
    const id = `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Validate required properties
    this.validateCreateProps(props);

    return new Report({
      ...props,
      id,
      status: ReportStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute report from persistence
   */
  static fromPersistence(props: ReportProps): Report {
    return new Report(props);
  }

  /**
   * Validate creation properties
   */
  private static validateCreateProps(props: Omit<ReportProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>): void {
    if (!props.agencyId?.trim()) {
      throw new InvalidReportConfigurationError('Agency ID is required');
    }

    if (!props.title?.trim()) {
      throw new InvalidReportConfigurationError('Report title is required');
    }

    if (props.title.length > 200) {
      throw new InvalidReportConfigurationError('Report title cannot exceed 200 characters');
    }

    if (!props.createdBy?.trim()) {
      throw new InvalidReportConfigurationError('Created by user ID is required');
    }

    if (!Object.values(ReportType).includes(props.type)) {
      throw new InvalidReportConfigurationError(`Invalid report type: ${props.type}`);
    }

    if (!Object.values(ReportFormat).includes(props.format)) {
      throw new InvalidReportConfigurationError(`Invalid report format: ${props.format}`);
    }

    if (!Object.values(ReportFrequency).includes(props.frequency)) {
      throw new InvalidReportConfigurationError(`Invalid report frequency: ${props.frequency}`);
    }

    // Validate configuration
    this.validateConfiguration(props.configuration);

    // Validate tags
    if (props.tags && props.tags.length > 10) {
      throw new InvalidReportConfigurationError('Cannot have more than 10 tags');
    }

    if (props.tags && props.tags.some((tag) => tag.length > 50)) {
      throw new InvalidReportConfigurationError('Tag length cannot exceed 50 characters');
    }
  }

  /**
   * Validate report configuration
   */
  private static validateConfiguration(config: ReportConfiguration): void {
    if (config.limit !== undefined && (config.limit < 1 || config.limit > 10000)) {
      throw new InvalidReportConfigurationError('Limit must be between 1 and 10000');
    }

    if (config.groupBy && !['day', 'week', 'month', 'quarter'].includes(config.groupBy)) {
      throw new InvalidReportConfigurationError('Invalid groupBy value');
    }

    if (config.sortDirection && !['ASC', 'DESC'].includes(config.sortDirection)) {
      throw new InvalidReportConfigurationError('Sort direction must be ASC or DESC');
    }
  }

  /**
   * Validate domain invariants
   */
  private validateInvariants(): void {
    // Status transition validation
    if (this.props.status === ReportStatus.COMPLETED && !this.props.result) {
      throw new ReportDomainError('Completed reports must have results', 'INVALID_STATE');
    }

    if (this.props.status === ReportStatus.FAILED && !this.props.errorMessage) {
      throw new ReportDomainError('Failed reports must have error message', 'INVALID_STATE');
    }

    if (this.props.status === ReportStatus.RUNNING && !this.props.executedAt) {
      throw new ReportDomainError('Running reports must have execution timestamp', 'INVALID_STATE');
    }

    // Date consistency validation
    if (this.props.executedAt && this.props.executedAt < this.props.createdAt) {
      throw new ReportDomainError('Execution date cannot be before creation date', 'INVALID_DATE_SEQUENCE');
    }

    if (this.props.completedAt && this.props.executedAt && this.props.completedAt < this.props.executedAt) {
      throw new ReportDomainError('Completion date cannot be before execution date', 'INVALID_DATE_SEQUENCE');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get agencyId(): string {
    return this.props.agencyId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get type(): ReportType {
    return this.props.type;
  }

  get status(): ReportStatus {
    return this.props.status;
  }

  get format(): ReportFormat {
    return this.props.format;
  }

  get frequency(): ReportFrequency {
    return this.props.frequency;
  }

  get period(): ReportPeriod {
    return this.props.period;
  }

  get configuration(): ReportConfiguration {
    return { ...this.props.configuration };
  }

  get result(): ReportResult | undefined {
    return this.props.result ? { ...this.props.result } : undefined;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  get scheduledAt(): Date | undefined {
    return this.props.scheduledAt ? new Date(this.props.scheduledAt) : undefined;
  }

  get executedAt(): Date | undefined {
    return this.props.executedAt ? new Date(this.props.executedAt) : undefined;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt ? new Date(this.props.completedAt) : undefined;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get tags(): string[] {
    return this.props.tags ? [...this.props.tags] : [];
  }

  get isPublic(): boolean {
    return this.props.isPublic;
  }

  get shareToken(): string | undefined {
    return this.props.shareToken;
  }

  /**
   * Business logic methods
   */

  /**
   * Check if report can be executed
   */
  canExecute(): boolean {
    return [ReportStatus.DRAFT, ReportStatus.SCHEDULED, ReportStatus.FAILED].includes(this.props.status);
  }

  /**
   * Check if report can be cancelled
   */
  canCancel(): boolean {
    return [ReportStatus.SCHEDULED, ReportStatus.RUNNING].includes(this.props.status);
  }

  /**
   * Check if report can be edited
   */
  canEdit(): boolean {
    return [ReportStatus.DRAFT, ReportStatus.FAILED].includes(this.props.status);
  }

  /**
   * Check if report is recurring
   */
  isRecurring(): boolean {
    return this.props.frequency !== ReportFrequency.ONE_TIME;
  }

  /**
   * Schedule report for execution
   */
  schedule(scheduledAt: Date, userId: string): Report {
    if (!this.canExecute()) {
      throw new ReportNotExecutableError(`Cannot schedule report in ${this.props.status} status`);
    }

    if (scheduledAt <= new Date()) {
      throw new InvalidReportConfigurationError('Scheduled time must be in the future');
    }

    return new Report({
      ...this.props,
      status: ReportStatus.SCHEDULED,
      scheduledAt,
      updatedAt: new Date(),
    });
  }

  /**
   * Start report execution
   */
  startExecution(userId: string): Report {
    if (!this.canExecute()) {
      throw new ReportNotExecutableError(`Cannot execute report in ${this.props.status} status`);
    }

    const { errorMessage, ...propsWithoutError } = this.props;
    return new Report({
      ...propsWithoutError,
      status: ReportStatus.RUNNING,
      executedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Complete report execution with results
   */
  completeExecution(result: ReportResult, userId: string): Report {
    if (this.props.status !== ReportStatus.RUNNING) {
      throw new ReportDomainError('Can only complete running reports', 'INVALID_STATUS_TRANSITION');
    }

    const { errorMessage, ...propsWithoutError } = this.props;
    return new Report({
      ...propsWithoutError,
      status: ReportStatus.COMPLETED,
      result,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Fail report execution with error
   */
  failExecution(errorMessage: string, userId: string): Report {
    if (this.props.status !== ReportStatus.RUNNING) {
      throw new ReportDomainError('Can only fail running reports', 'INVALID_STATUS_TRANSITION');
    }

    return new Report({
      ...this.props,
      status: ReportStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Cancel report execution
   */
  cancel(userId: string): Report {
    if (!this.canCancel()) {
      throw new ReportDomainError(`Cannot cancel report in ${this.props.status} status`, 'INVALID_STATUS_TRANSITION');
    }

    return new Report({
      ...this.props,
      status: ReportStatus.CANCELLED,
      updatedAt: new Date(),
    });
  }

  /**
   * Update report configuration
   */
  updateConfiguration(
    updates: Partial<Pick<ReportProps, 'title' | 'description' | 'period' | 'configuration' | 'format' | 'tags'>>,
    userId: string
  ): Report {
    if (!this.canEdit()) {
      throw new ReportDomainError(`Cannot edit report in ${this.props.status} status`, 'INVALID_STATUS_TRANSITION');
    }

    // Validate updates
    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new InvalidReportConfigurationError('Report title is required');
      }
      if (updates.title.length > 200) {
        throw new InvalidReportConfigurationError('Report title cannot exceed 200 characters');
      }
    }

    if (updates.configuration) {
      Report.validateConfiguration(updates.configuration);
    }

    if (updates.tags && updates.tags.length > 10) {
      throw new InvalidReportConfigurationError('Cannot have more than 10 tags');
    }

    return new Report({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Generate share token for public access
   */
  generateShareToken(userId: string): Report {
    if (!this.props.isPublic) {
      throw new ReportDomainError('Cannot generate share token for private report', 'INVALID_OPERATION');
    }

    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    return new Report({
      ...this.props,
      shareToken,
      updatedAt: new Date(),
    });
  }

  /**
   * Toggle public/private status
   */
  togglePublicAccess(isPublic: boolean, userId: string): Report {
    const newProps = {
      ...this.props,
      isPublic,
      updatedAt: new Date(),
    };

    if (!isPublic) {
      const { shareToken, ...propsWithoutToken } = newProps;
      return new Report(propsWithoutToken);
    }

    return new Report(newProps);
  }

  /**
   * Get estimated execution time based on report type and period
   */
  getEstimatedExecutionTimeMs(): number {
    const baseTime = this.getBaseExecutionTime();
    const periodMultiplier = this.getPeriodComplexityMultiplier();
    const configMultiplier = this.getConfigurationComplexityMultiplier();

    return Math.round(baseTime * periodMultiplier * configMultiplier);
  }

  private getBaseExecutionTime(): number {
    const baseTimes: Record<ReportType, number> = {
      [ReportType.SALES_SUMMARY]: 5000,
      [ReportType.CUSTOMER_ANALYTICS]: 8000,
      [ReportType.PRODUCT_PERFORMANCE]: 7000,
      [ReportType.INVENTORY_STATUS]: 3000,
      [ReportType.PAYMENT_AGING]: 6000,
      [ReportType.SHIPPING_ANALYTICS]: 4000,
      [ReportType.ORDER_FULFILLMENT]: 5000,
      [ReportType.FINANCIAL_SUMMARY]: 10000,
      [ReportType.OPERATIONAL_METRICS]: 12000,
      [ReportType.EXECUTIVE_DASHBOARD]: 15000,
    };

    return baseTimes[this.props.type] || 5000;
  }

  private getPeriodComplexityMultiplier(): number {
    const days = this.props.period.getDurationInDays();

    if (days <= 7) return 1.0;
    if (days <= 30) return 1.5;
    if (days <= 90) return 2.0;
    if (days <= 365) return 3.0;
    return 4.0;
  }

  private getConfigurationComplexityMultiplier(): number {
    let multiplier = 1.0;

    if (this.props.configuration.includeCharts) multiplier += 0.2;
    if (this.props.configuration.includeRawData) multiplier += 0.3;
    if (this.props.configuration.groupBy) multiplier += 0.15;
    if (this.props.configuration.filters && Object.keys(this.props.configuration.filters).length > 0) {
      multiplier += 0.1 * Object.keys(this.props.configuration.filters).length;
    }

    return Math.min(multiplier, 3.0); // Cap at 3x
  }

  /**
   * Check if report needs to run (for scheduled reports)
   */
  needsExecution(currentTime: Date = new Date()): boolean {
    if (!this.isRecurring() || this.props.status !== ReportStatus.SCHEDULED) {
      return false;
    }

    if (!this.props.scheduledAt) {
      return false;
    }

    return currentTime >= this.props.scheduledAt;
  }

  /**
   * Entity equality
   */
  equals(other: Report): boolean {
    return this.props.id === other.props.id;
  }

  /**
   * Get entity for persistence
   */
  toPersistence(): ReportProps {
    return {
      ...this.props,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      scheduledAt: this.props.scheduledAt ? new Date(this.props.scheduledAt) : undefined,
      executedAt: this.props.executedAt ? new Date(this.props.executedAt) : undefined,
      completedAt: this.props.completedAt ? new Date(this.props.completedAt) : undefined,
    };
  }

  /**
   * String representation
   */
  toString(): string {
    return `Report(${this.props.id}: ${this.props.title} - ${this.props.status})`;
  }
}
