/**
 * Agency Entity - Domain Model
 * Multi-agency management for offline distribution system
 */

import type { Email } from '../value-objects/email';

/**
 * Agency status enumeration
 */
export enum AgencyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Agency configuration settings interface
 */
export interface AgencySettings {
  allowCreditSales: boolean;
  defaultCreditDays: number;
  maxCreditLimit: number;
  requireApprovalForOrders: boolean;
  enableInventoryTracking: boolean;
  taxRate: number;
  currency: string;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  notifications: {
    lowStock: boolean;
    overduePayments: boolean;
    newOrders: boolean;
  };
}

/**
 * Agency creation parameters
 */
export interface CreateAgencyParams {
  name: string;
  databasePath: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Partial<AgencySettings>;
  status?: AgencyStatus;
}

/**
 * Agency properties for entity construction
 */
export interface AgencyProps {
  id: string;
  name: string;
  databasePath: string;
  contactPerson: string | undefined;
  phone: string | undefined;
  email: Email | undefined;
  address: string | undefined;
  settings: AgencySettings;
  status: AgencyStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | undefined;
}

/**
 * Agency entity domain errors
 */
export class AgencyDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgencyDomainError';
  }
}

export class AgencyValidationError extends AgencyDomainError {
  constructor(field: string, reason: string) {
    super(`Agency validation error in ${field}: ${reason}`);
    this.name = 'AgencyValidationError';
  }
}

export class AgencyBusinessError extends AgencyDomainError {
  constructor(reason: string) {
    super(`Agency business rule violation: ${reason}`);
    this.name = 'AgencyBusinessError';
  }
}

/**
 * Agency Entity
 * Aggregate root for agency domain - designed for multi-agency offline system
 */
export class Agency {
  private readonly _id: string;
  private _name: string;
  private _databasePath: string;
  private _contactPerson: string | undefined;
  private _phone: string | undefined;
  private _email: Email | undefined;
  private _address: string | undefined;
  private _settings: AgencySettings;
  private _status: AgencyStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _createdBy: string | undefined;

  // Business constants
  private static readonly MIN_NAME_LENGTH = 2;
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_PHONE_LENGTH = 20;
  private static readonly MAX_ADDRESS_LENGTH = 500;
  private static readonly MAX_CREDIT_LIMIT = 1000000; // Maximum credit limit in base currency
  private static readonly MIN_CREDIT_DAYS = 1;
  private static readonly MAX_CREDIT_DAYS = 365;

  /**
   * Creates an Agency entity
   * @param props - Agency properties
   */
  constructor(props: AgencyProps) {
    this.validateAgencyProps(props);

    this._id = props.id;
    this._name = props.name;
    this._databasePath = props.databasePath;
    this._contactPerson = props.contactPerson;
    this._phone = props.phone;
    this._email = props.email;
    this._address = props.address;
    this._settings = { ...props.settings };
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._createdBy = props.createdBy;

    // Note: Business methods need to update state, so not freezing the object
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get databasePath(): string {
    return this._databasePath;
  }

  public get contactPerson(): string | undefined {
    return this._contactPerson;
  }

  public get phone(): string | undefined {
    return this._phone;
  }

  public get email(): Email | undefined {
    return this._email;
  }

  public get address(): string | undefined {
    return this._address;
  }

  public get settings(): Readonly<AgencySettings> {
    return Object.freeze({ ...this._settings });
  }

  public get status(): AgencyStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  public get createdBy(): string | undefined {
    return this._createdBy;
  }

  // Business Logic Methods

  /**
   * Updates agency basic information
   * @param updates - Fields to update
   */
  public updateBasicInfo(updates: {
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): void {
    if (this._status === AgencyStatus.SUSPENDED) {
      throw new AgencyBusinessError('Cannot update suspended agency information');
    }

    if (updates.name !== undefined) {
      this.validateName(updates.name);
      this._name = updates.name.trim();
    }

    if (updates.contactPerson !== undefined) {
      this.validateContactPerson(updates.contactPerson);
      this._contactPerson = updates.contactPerson.trim();
    }

    if (updates.phone !== undefined) {
      this.validatePhone(updates.phone);
      this._phone = updates.phone.trim();
    }

    if (updates.email !== undefined) {
      this.validateEmailString(updates.email);
      // Email validation will be handled by Email value object when implemented
      this._email = undefined; // Placeholder until Email VO is available
    }

    if (updates.address !== undefined) {
      this.validateAddress(updates.address);
      this._address = updates.address.trim();
    }

    this.updateTimestamp();
  }

  /**
   * Updates agency settings
   * @param settingsUpdates - Settings to update
   */
  public updateSettings(settingsUpdates: Partial<AgencySettings>): void {
    if (this._status === AgencyStatus.SUSPENDED) {
      throw new AgencyBusinessError('Cannot update suspended agency settings');
    }

    const newSettings = { ...this._settings, ...settingsUpdates };
    this.validateSettings(newSettings);

    this._settings = newSettings;
    this.updateTimestamp();
  }

  /**
   * Activates the agency
   */
  public activate(): void {
    if (this._status === AgencyStatus.ACTIVE) {
      throw new AgencyBusinessError('Agency is already active');
    }

    this._status = AgencyStatus.ACTIVE;
    this.updateTimestamp();
  }

  /**
   * Deactivates the agency
   */
  public deactivate(): void {
    if (this._status === AgencyStatus.INACTIVE) {
      throw new AgencyBusinessError('Agency is already inactive');
    }

    if (this._status === AgencyStatus.SUSPENDED) {
      throw new AgencyBusinessError('Cannot deactivate suspended agency - must be unsuspended first');
    }

    this._status = AgencyStatus.INACTIVE;
    this.updateTimestamp();
  }

  /**
   * Suspends the agency
   */
  public suspend(): void {
    if (this._status === AgencyStatus.SUSPENDED) {
      throw new AgencyBusinessError('Agency is already suspended');
    }

    this._status = AgencyStatus.SUSPENDED;
    this.updateTimestamp();
  }

  /**
   * Unsuspends the agency (returns to active status)
   */
  public unsuspend(): void {
    if (this._status !== AgencyStatus.SUSPENDED) {
      throw new AgencyBusinessError('Agency is not currently suspended');
    }

    this._status = AgencyStatus.ACTIVE;
    this.updateTimestamp();
  }

  /**
   * Checks if agency is operational (active status)
   * @returns True if agency can conduct business
   */
  public isOperational(): boolean {
    return this._status === AgencyStatus.ACTIVE;
  }

  /**
   * Checks if credit sales are allowed
   * @returns True if credit sales are enabled
   */
  public allowsCreditSales(): boolean {
    return this._settings.allowCreditSales && this.isOperational();
  }

  /**
   * Gets maximum credit limit for customers
   * @returns Maximum credit limit amount
   */
  public getMaxCreditLimit(): number {
    return this._settings.maxCreditLimit;
  }

  /**
   * Gets default credit terms in days
   * @returns Default credit days
   */
  public getDefaultCreditDays(): number {
    return this._settings.defaultCreditDays;
  }

  /**
   * Checks if inventory tracking is enabled
   * @returns True if inventory tracking is active
   */
  public hasInventoryTracking(): boolean {
    return this._settings.enableInventoryTracking;
  }

  /**
   * Gets the tax rate for the agency
   * @returns Tax rate as decimal (e.g., 0.15 for 15%)
   */
  public getTaxRate(): number {
    return this._settings.taxRate;
  }

  /**
   * Gets display information for UI
   * @returns Safe display data
   */
  public getDisplayInfo(): {
    id: string;
    name: string;
    contactPerson: string | undefined;
    phone: string | undefined;
    email: string | undefined;
    address: string | undefined;
    status: AgencyStatus;
    isOperational: boolean;
    allowsCreditSales: boolean;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id,
      name: this._name,
      contactPerson: this._contactPerson,
      phone: this._phone,
      email: this._email?.value,
      address: this._address,
      status: this._status,
      isOperational: this.isOperational(),
      allowsCreditSales: this.allowsCreditSales(),
      currency: this._settings.currency,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Converts entity to persistence format
   * @returns Data suitable for database storage
   */
  public toPersistence(): {
    id: string;
    name: string;
    databasePath: string;
    contactPerson: string | undefined;
    phone: string | undefined;
    email: string | undefined;
    address: string | undefined;
    settings: string; // JSON string
    status: AgencyStatus;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | undefined;
  } {
    return {
      id: this._id,
      name: this._name,
      databasePath: this._databasePath,
      contactPerson: this._contactPerson,
      phone: this._phone,
      email: this._email?.value,
      address: this._address,
      settings: JSON.stringify(this._settings),
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      createdBy: this._createdBy,
    };
  }

  /**
   * Factory method to create new agency
   * @param params - Creation parameters
   * @param createdBy - User ID who created the agency
   * @returns New Agency instance
   */
  public static create(params: CreateAgencyParams, createdBy?: string): Agency {
    this.validateCreateParams(params);

    const now = new Date();
    const id = this.generateId();

    const defaultSettings: AgencySettings = {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 50000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.15, // 15% default tax rate
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: true,
      },
    };

    const settings: AgencySettings = {
      ...defaultSettings,
      ...params.settings,
    };

    const props: AgencyProps = {
      id,
      name: params.name.trim(),
      databasePath: params.databasePath.trim(),
      contactPerson: params.contactPerson?.trim(),
      phone: params.phone?.trim(),
      email: undefined, // Will be set when Email VO is implemented
      address: params.address?.trim(),
      settings,
      status: params.status || AgencyStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return new Agency(props);
  }

  /**
   * Factory method to reconstruct agency from persistence
   * @param persistenceData - Data from database
   * @returns Agency instance
   */
  public static fromPersistence(persistenceData: {
    id: string;
    name: string;
    databasePath: string;
    contactPerson: string | undefined;
    phone: string | undefined;
    email: string | undefined;
    address: string | undefined;
    settings: string; // JSON string
    status: AgencyStatus;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | undefined;
  }): Agency {
    let settings: AgencySettings;

    try {
      settings = JSON.parse(persistenceData.settings) as AgencySettings;
    } catch (error) {
      throw new AgencyValidationError('settings', 'Invalid JSON format in settings');
    }

    const props: AgencyProps = {
      id: persistenceData.id,
      name: persistenceData.name,
      databasePath: persistenceData.databasePath,
      contactPerson: persistenceData.contactPerson,
      phone: persistenceData.phone,
      email: undefined, // Will be set when Email VO is implemented
      address: persistenceData.address,
      settings,
      status: persistenceData.status,
      createdAt: persistenceData.createdAt,
      updatedAt: persistenceData.updatedAt,
      createdBy: persistenceData.createdBy,
    };

    return new Agency(props);
  }

  // Private validation methods

  private updateTimestamp(): void {
    (this as any)._updatedAt = new Date();
  }

  private validateAgencyProps(props: AgencyProps): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new AgencyValidationError('id', 'ID must be a non-empty string');
    }

    this.validateName(props.name);
    this.validateDatabasePath(props.databasePath);

    if (props.contactPerson !== undefined) {
      this.validateContactPerson(props.contactPerson);
    }

    if (props.phone !== undefined) {
      this.validatePhone(props.phone);
    }

    if (props.address !== undefined) {
      this.validateAddress(props.address);
    }

    this.validateSettings(props.settings);

    if (!Object.values(AgencyStatus).includes(props.status)) {
      throw new AgencyValidationError('status', 'Invalid agency status');
    }

    if (!(props.createdAt instanceof Date)) {
      throw new AgencyValidationError('createdAt', 'Created date must be a Date instance');
    }

    if (!(props.updatedAt instanceof Date)) {
      throw new AgencyValidationError('updatedAt', 'Updated date must be a Date instance');
    }
  }

  private validateName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new AgencyValidationError('name', 'Name must be a non-empty string');
    }

    const trimmed = name.trim();
    if (trimmed.length < Agency.MIN_NAME_LENGTH) {
      throw new AgencyValidationError('name', `Name must be at least ${Agency.MIN_NAME_LENGTH} characters long`);
    }

    if (trimmed.length > Agency.MAX_NAME_LENGTH) {
      throw new AgencyValidationError('name', `Name must not exceed ${Agency.MAX_NAME_LENGTH} characters`);
    }
  }

  private validateDatabasePath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new AgencyValidationError('databasePath', 'Database path must be a non-empty string');
    }

    const trimmed = path.trim();
    if (!trimmed.endsWith('.db')) {
      throw new AgencyValidationError('databasePath', 'Database path must end with .db extension');
    }

    if (trimmed.includes('..') || trimmed.includes('//')) {
      throw new AgencyValidationError('databasePath', 'Database path contains invalid characters');
    }
  }

  private validateContactPerson(contactPerson: string): void {
    if (contactPerson && typeof contactPerson === 'string') {
      const trimmed = contactPerson.trim();
      if (trimmed.length > Agency.MAX_NAME_LENGTH) {
        throw new AgencyValidationError(
          'contactPerson',
          `Contact person name must not exceed ${Agency.MAX_NAME_LENGTH} characters`
        );
      }
    }
  }

  private validatePhone(phone: string): void {
    if (phone && typeof phone === 'string') {
      const trimmed = phone.trim();
      if (trimmed.length > Agency.MAX_PHONE_LENGTH) {
        throw new AgencyValidationError('phone', `Phone number must not exceed ${Agency.MAX_PHONE_LENGTH} characters`);
      }
    }
  }

  private validateEmailString(email: string): void {
    if (email && typeof email === 'string') {
      const trimmed = email.trim();
      // Basic email validation - will be enhanced when Email VO is available
      if (trimmed.length > 0 && !trimmed.includes('@')) {
        throw new AgencyValidationError('email', 'Invalid email format');
      }
    }
  }

  private validateAddress(address: string): void {
    if (address && typeof address === 'string') {
      const trimmed = address.trim();
      if (trimmed.length > Agency.MAX_ADDRESS_LENGTH) {
        throw new AgencyValidationError('address', `Address must not exceed ${Agency.MAX_ADDRESS_LENGTH} characters`);
      }
    }
  }

  private validateSettings(settings: AgencySettings): void {
    if (!settings || typeof settings !== 'object') {
      throw new AgencyValidationError('settings', 'Settings must be an object');
    }

    if (typeof settings.allowCreditSales !== 'boolean') {
      throw new AgencyValidationError('settings.allowCreditSales', 'allowCreditSales must be a boolean');
    }

    if (
      typeof settings.defaultCreditDays !== 'number' ||
      settings.defaultCreditDays < Agency.MIN_CREDIT_DAYS ||
      settings.defaultCreditDays > Agency.MAX_CREDIT_DAYS
    ) {
      throw new AgencyValidationError(
        'settings.defaultCreditDays',
        `defaultCreditDays must be between ${Agency.MIN_CREDIT_DAYS} and ${Agency.MAX_CREDIT_DAYS}`
      );
    }

    if (
      typeof settings.maxCreditLimit !== 'number' ||
      settings.maxCreditLimit < 0 ||
      settings.maxCreditLimit > Agency.MAX_CREDIT_LIMIT
    ) {
      throw new AgencyValidationError(
        'settings.maxCreditLimit',
        `maxCreditLimit must be between 0 and ${Agency.MAX_CREDIT_LIMIT}`
      );
    }

    if (typeof settings.requireApprovalForOrders !== 'boolean') {
      throw new AgencyValidationError(
        'settings.requireApprovalForOrders',
        'requireApprovalForOrders must be a boolean'
      );
    }

    if (typeof settings.enableInventoryTracking !== 'boolean') {
      throw new AgencyValidationError('settings.enableInventoryTracking', 'enableInventoryTracking must be a boolean');
    }

    if (typeof settings.taxRate !== 'number' || settings.taxRate < 0 || settings.taxRate > 1) {
      throw new AgencyValidationError('settings.taxRate', 'taxRate must be between 0 and 1 (decimal percentage)');
    }

    if (!settings.currency || typeof settings.currency !== 'string' || settings.currency.length !== 3) {
      throw new AgencyValidationError('settings.currency', 'currency must be a 3-character currency code');
    }
  }

  private static validateCreateParams(params: CreateAgencyParams): void {
    if (!params.name || typeof params.name !== 'string') {
      throw new AgencyValidationError('name', 'Name is required and must be a string');
    }

    if (!params.databasePath || typeof params.databasePath !== 'string') {
      throw new AgencyValidationError('databasePath', 'Database path is required and must be a string');
    }

    if (params.status && !Object.values(AgencyStatus).includes(params.status)) {
      throw new AgencyValidationError('status', 'Invalid agency status');
    }
  }

  private static generateId(): string {
    // Generate a unique ID for the agency
    return `agency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
