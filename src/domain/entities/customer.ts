/**
 * Customer Entity
 *
 * Represents customers in the goods distribution system.
 * Core aggregate root for customer management including credit limits,
 * contact information, purchase history, and business relationships.
 *
 * Business Rules:
 * - Customers must have unique identifier within agency
 * - Credit limits cannot be negative
 * - Outstanding balance cannot exceed credit limit for active customers
 * - Contact information must be valid
 * - Customer status determines business operations
 * - Payment terms must be reasonable
 * - Address information is required for delivery
 * - Purchase history maintains audit trail
 *
 * @domain Customer Management
 * @version 1.0.0
 */

import { Email } from '../value-objects/email';
import { Money, CurrencyCode } from '../value-objects/money';

/**
 * Customer status enumeration
 */
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  BLACKLISTED = 'BLACKLISTED',
}

/**
 * Customer type enumeration
 */
export enum CustomerType {
  RETAIL = 'RETAIL', // Individual consumers
  WHOLESALE = 'WHOLESALE', // Bulk buyers
  DISTRIBUTOR = 'DISTRIBUTOR', // Re-sellers
  CORPORATE = 'CORPORATE', // Business accounts
  GOVERNMENT = 'GOVERNMENT', // Government entities
  ONLINE = 'ONLINE', // E-commerce customers
}

/**
 * Payment terms enumeration
 */
export enum PaymentTerms {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  NET_7 = 'NET_7', // Payment due in 7 days
  NET_15 = 'NET_15', // Payment due in 15 days
  NET_30 = 'NET_30', // Payment due in 30 days
  NET_45 = 'NET_45', // Payment due in 45 days
  NET_60 = 'NET_60', // Payment due in 60 days
  ADVANCE_PAYMENT = 'ADVANCE_PAYMENT',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT',
}

/**
 * Customer address interface
 */
export interface CustomerAddress {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly isDefault?: boolean;
  readonly addressType?: 'BILLING' | 'SHIPPING' | 'BOTH';
}

/**
 * Customer contact information
 */
export interface CustomerContact {
  readonly name: string;
  readonly title?: string;
  readonly email?: Email;
  readonly phone?: string;
  readonly mobile?: string;
  readonly isPrimary?: boolean;
}

/**
 * Purchase history entry
 */
export interface PurchaseHistoryEntry {
  readonly orderId: string;
  readonly orderDate: Date;
  readonly totalAmount: Money;
  readonly paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  readonly paymentDate?: Date;
}

/**
 * Credit limit change entry
 */
export interface CreditLimitChangeEntry {
  readonly previousLimit: Money;
  readonly newLimit: Money;
  readonly reason: string;
  readonly changedBy: string;
  readonly changedAt: Date;
  readonly notes?: string;
}

/**
 * Customer creation properties
 */
export interface CustomerProps {
  readonly customerCode: string;
  readonly companyName?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly customerType: CustomerType;
  readonly email: Email;
  readonly phone?: string;
  readonly mobile?: string;
  readonly addresses: CustomerAddress[];
  readonly contacts?: CustomerContact[];
  readonly creditLimit: Money;
  readonly paymentTerms: PaymentTerms;
  readonly taxNumber?: string;
  readonly website?: string;
  readonly notes?: string;
  readonly agencyId: string;
  readonly createdBy: string;
}

/**
 * Customer persistence interface
 */
export interface CustomerPersistence {
  readonly id: string;
  readonly customerCode: string;
  readonly companyName: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly customerType: CustomerType;
  readonly status: CustomerStatus;
  readonly email: string;
  readonly phone: string | null;
  readonly mobile: string | null;
  readonly addresses: CustomerAddress[];
  readonly contacts: CustomerContact[];
  readonly creditLimit: number;
  readonly creditLimitCurrency: CurrencyCode;
  readonly outstandingBalance: number;
  readonly outstandingBalanceCurrency: CurrencyCode;
  readonly availableCredit: number;
  readonly paymentTerms: PaymentTerms;
  readonly taxNumber: string | null;
  readonly website: string | null;
  readonly notes: string | null;
  readonly lastOrderDate: Date | null;
  readonly totalOrdersCount: number;
  readonly totalOrdersValue: number;
  readonly averageOrderValue: number;
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
  readonly purchaseHistory: PurchaseHistoryEntry[];
  readonly creditLimitHistory: CreditLimitChangeEntry[];
}

/**
 * Custom error classes for Customer domain
 */
export class CustomerDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'CustomerDomainError';
  }
}

export class CustomerValidationError extends CustomerDomainError {
  constructor(message: string) {
    super(message, 'CUSTOMER_VALIDATION_ERROR');
    this.name = 'CustomerValidationError';
  }
}

export class InvalidCustomerCodeError extends CustomerValidationError {
  constructor(customerCode: string) {
    super(`Invalid customer code format: ${customerCode}`);
    this.name = 'InvalidCustomerCodeError';
  }
}

export class InsufficientCreditError extends CustomerDomainError {
  constructor(requested: number, available: number) {
    super(`Insufficient credit: requested ${requested}, available ${available}`, 'INSUFFICIENT_CREDIT');
    this.name = 'InsufficientCreditError';
  }
}

export class CustomerStatusError extends CustomerDomainError {
  constructor(operation: string, status: CustomerStatus) {
    super(`Cannot ${operation} for customer with status: ${status}`, 'INVALID_STATUS');
    this.name = 'CustomerStatusError';
  }
}

export class InvalidAddressError extends CustomerValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAddressError';
  }
}

/**
 * Customer Entity
 *
 * Aggregate root for customer management in the goods distribution system.
 * Handles customer information, credit management, contact details, and
 * business relationships with comprehensive validation and audit trail.
 */
export class Customer {
  private _id: string;
  private _customerCode: string;
  private _companyName: string | null;
  private _firstName: string;
  private _lastName: string;
  private _customerType: CustomerType;
  private _status: CustomerStatus;
  private _email: Email;
  private _phone: string | null;
  private _mobile: string | null;
  private _addresses: CustomerAddress[];
  private _contacts: CustomerContact[];
  private _creditLimit: Money;
  private _outstandingBalance: Money;
  private _paymentTerms: PaymentTerms;
  private _taxNumber: string | null;
  private _website: string | null;
  private _notes: string | null;
  private _lastOrderDate: Date | null;
  private _totalOrdersCount: number;
  private _totalOrdersValue: Money;
  private _agencyId: string;
  private _createdBy: string;
  private _createdAt: Date;
  private _updatedBy: string | null;
  private _updatedAt: Date | null;
  private _purchaseHistory: PurchaseHistoryEntry[];
  private _creditLimitHistory: CreditLimitChangeEntry[];

  private constructor(props: CustomerProps, id?: string, skipValidationAndFreeze = false) {
    this._id = id || this.generateId();
    this._customerCode = props.customerCode;
    this._companyName = props.companyName || null;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._customerType = props.customerType;
    this._status = CustomerStatus.PENDING_APPROVAL;
    this._email = props.email;
    this._phone = props.phone || null;
    this._mobile = props.mobile || null;
    this._addresses = [...props.addresses];
    this._contacts = [...(props.contacts || [])];
    this._creditLimit = props.creditLimit;
    this._outstandingBalance = Money.zero(props.creditLimit.currency);
    this._paymentTerms = props.paymentTerms;
    this._taxNumber = props.taxNumber || null;
    this._website = props.website || null;
    this._notes = props.notes || null;
    this._lastOrderDate = null;
    this._totalOrdersCount = 0;
    this._totalOrdersValue = Money.zero(props.creditLimit.currency);
    this._agencyId = props.agencyId;
    this._createdBy = props.createdBy;
    this._createdAt = new Date();
    this._updatedBy = null;
    this._updatedAt = null;
    this._purchaseHistory = [];
    this._creditLimitHistory = [];

    if (!skipValidationAndFreeze) {
      this.validate();
      Object.freeze(this);
    }
  }

  /**
   * Create new Customer
   */
  public static create(props: CustomerProps): Customer {
    return new Customer(props);
  }

  /**
   * Reconstruct Customer from persistence
   */
  public static fromPersistence(data: CustomerPersistence): Customer {
    const props: CustomerProps = {
      customerCode: data.customerCode,
      ...(data.companyName && { companyName: data.companyName }),
      firstName: data.firstName,
      lastName: data.lastName,
      customerType: data.customerType,
      email: new Email(data.email),
      ...(data.phone && { phone: data.phone }),
      ...(data.mobile && { mobile: data.mobile }),
      addresses: data.addresses,
      contacts: data.contacts,
      creditLimit: Money.fromInteger(data.creditLimit, data.creditLimitCurrency),
      paymentTerms: data.paymentTerms,
      ...(data.taxNumber && { taxNumber: data.taxNumber }),
      ...(data.website && { website: data.website }),
      ...(data.notes && { notes: data.notes }),
      agencyId: data.agencyId,
      createdBy: data.createdBy,
    };

    const customer = new Customer(props, data.id, true); // Skip validation and freeze

    // Set persistence-specific properties
    (customer as any)._status = data.status;
    (customer as any)._outstandingBalance = Money.fromInteger(data.outstandingBalance, data.outstandingBalanceCurrency);
    (customer as any)._lastOrderDate = data.lastOrderDate;
    (customer as any)._totalOrdersCount = data.totalOrdersCount;
    (customer as any)._totalOrdersValue = Money.fromInteger(data.totalOrdersValue, data.creditLimitCurrency);
    (customer as any)._createdAt = data.createdAt;
    (customer as any)._updatedBy = data.updatedBy;
    (customer as any)._updatedAt = data.updatedAt;
    (customer as any)._purchaseHistory = [...data.purchaseHistory];
    (customer as any)._creditLimitHistory = [...data.creditLimitHistory];

    // Now freeze the object
    Object.freeze(customer);

    return customer;
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get customerCode(): string {
    return this._customerCode;
  }
  public get companyName(): string | null {
    return this._companyName;
  }
  public get firstName(): string {
    return this._firstName;
  }
  public get lastName(): string {
    return this._lastName;
  }
  public get fullName(): string {
    const company = this._companyName ? `${this._companyName} - ` : '';
    return `${company}${this._firstName} ${this._lastName}`.trim();
  }
  public get customerType(): CustomerType {
    return this._customerType;
  }
  public get status(): CustomerStatus {
    return this._status;
  }
  public get email(): Email {
    return this._email;
  }
  public get phone(): string | null {
    return this._phone;
  }
  public get mobile(): string | null {
    return this._mobile;
  }
  public get addresses(): CustomerAddress[] {
    return [...this._addresses];
  }
  public get contacts(): CustomerContact[] {
    return [...this._contacts];
  }
  public get creditLimit(): Money {
    return this._creditLimit;
  }
  public get outstandingBalance(): Money {
    return this._outstandingBalance;
  }
  public get availableCredit(): Money {
    return this._creditLimit.subtract(this._outstandingBalance);
  }
  public get paymentTerms(): PaymentTerms {
    return this._paymentTerms;
  }
  public get taxNumber(): string | null {
    return this._taxNumber;
  }
  public get website(): string | null {
    return this._website;
  }
  public get notes(): string | null {
    return this._notes;
  }
  public get lastOrderDate(): Date | null {
    return this._lastOrderDate ? new Date(this._lastOrderDate) : null;
  }
  public get totalOrdersCount(): number {
    return this._totalOrdersCount;
  }
  public get totalOrdersValue(): Money {
    return this._totalOrdersValue;
  }
  public get averageOrderValue(): Money {
    if (this._totalOrdersCount === 0) {
      return Money.zero(this._totalOrdersValue.currency);
    }
    return this._totalOrdersValue.divide(this._totalOrdersCount);
  }
  public get agencyId(): string {
    return this._agencyId;
  }
  public get createdBy(): string {
    return this._createdBy;
  }
  public get createdAt(): Date {
    return new Date(this._createdAt);
  }
  public get updatedBy(): string | null {
    return this._updatedBy;
  }
  public get updatedAt(): Date | null {
    return this._updatedAt ? new Date(this._updatedAt) : null;
  }
  public get purchaseHistory(): PurchaseHistoryEntry[] {
    return [...this._purchaseHistory];
  }
  public get creditLimitHistory(): CreditLimitChangeEntry[] {
    return [...this._creditLimitHistory];
  }

  // Business Logic Methods

  /**
   * Check if customer can place orders
   */
  public canPlaceOrders(): boolean {
    return this._status === CustomerStatus.ACTIVE;
  }

  /**
   * Check if customer has sufficient credit
   */
  public hasSufficientCredit(amount: Money): boolean {
    this.ensureSameCurrency(amount);
    return this.availableCredit.greaterThanOrEqual(amount);
  }

  /**
   * Check if customer is overdue on payments
   */
  public hasOverduePayments(): boolean {
    return this._purchaseHistory.some((entry) => entry.paymentStatus === 'OVERDUE');
  }

  /**
   * Get credit utilization percentage
   */
  public getCreditUtilization(): number {
    if (this._creditLimit.isZero()) {
      return 0;
    }
    return (this._outstandingBalance.decimalAmount / this._creditLimit.decimalAmount) * 100;
  }

  /**
   * Check if customer is high value
   */
  public isHighValueCustomer(threshold: Money): boolean {
    this.ensureSameCurrency(threshold);
    return this._totalOrdersValue.greaterThan(threshold);
  }

  /**
   * Get days since last order
   */
  public getDaysSinceLastOrder(): number | null {
    if (!this._lastOrderDate) {
      return null;
    }

    const now = new Date();
    const diffTime = now.getTime() - this._lastOrderDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get default address
   */
  public getDefaultAddress(): CustomerAddress | null {
    return this._addresses.find((addr) => addr.isDefault) || this._addresses[0] || null;
  }

  /**
   * Get primary contact
   */
  public getPrimaryContact(): CustomerContact | null {
    return this._contacts.find((contact) => contact.isPrimary) || this._contacts[0] || null;
  }

  // State Management Methods

  /**
   * Activate customer
   */
  public activate(userId: string): Customer {
    if (this._status === CustomerStatus.BLACKLISTED) {
      throw new CustomerStatusError('activate', this._status);
    }

    return this.updateStatus(CustomerStatus.ACTIVE, userId);
  }

  /**
   * Deactivate customer
   */
  public deactivate(userId: string): Customer {
    return this.updateStatus(CustomerStatus.INACTIVE, userId);
  }

  /**
   * Suspend customer
   */
  public suspend(userId: string, reason?: string): Customer {
    const updatedCustomer = this.updateStatus(CustomerStatus.SUSPENDED, userId);

    if (reason) {
      (updatedCustomer as any)._notes = this._notes
        ? `${this._notes}\n\nSuspension reason: ${reason}`
        : `Suspension reason: ${reason}`;
    }

    return updatedCustomer;
  }

  /**
   * Blacklist customer
   */
  public blacklist(userId: string, reason: string): Customer {
    const updatedCustomer = this.updateStatus(CustomerStatus.BLACKLISTED, userId);

    (updatedCustomer as any)._notes = this._notes
      ? `${this._notes}\n\nBlacklisted: ${reason}`
      : `Blacklisted: ${reason}`;

    return updatedCustomer;
  }

  /**
   * Approve pending customer
   */
  public approve(userId: string): Customer {
    if (this._status !== CustomerStatus.PENDING_APPROVAL) {
      throw new CustomerStatusError('approve', this._status);
    }

    return this.updateStatus(CustomerStatus.ACTIVE, userId);
  }

  // Credit Management Methods

  /**
   * Update credit limit
   */
  public updateCreditLimit(newLimit: Money, reason: string, userId: string, notes?: string): Customer {
    this.ensureSameCurrency(newLimit);

    if (newLimit.isNegative()) {
      throw new CustomerValidationError('Credit limit cannot be negative');
    }

    const changeEntry: CreditLimitChangeEntry = {
      previousLimit: this._creditLimit,
      newLimit,
      reason,
      changedBy: userId,
      changedAt: new Date(),
      ...(notes && { notes }),
    };

    const updatedCustomer = this.clone();
    updatedCustomer._creditLimit = newLimit;
    updatedCustomer._creditLimitHistory.push(changeEntry);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Reserve credit amount
   */
  public reserveCredit(amount: Money, userId: string): Customer {
    this.ensureSameCurrency(amount);

    if (!this.hasSufficientCredit(amount)) {
      throw new InsufficientCreditError(amount.decimalAmount, this.availableCredit.decimalAmount);
    }

    const updatedCustomer = this.clone();
    updatedCustomer._outstandingBalance = this._outstandingBalance.add(amount);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Release reserved credit
   */
  public releaseCredit(amount: Money, userId: string): Customer {
    this.ensureSameCurrency(amount);

    if (amount.greaterThan(this._outstandingBalance)) {
      throw new CustomerValidationError('Cannot release more than outstanding balance');
    }

    const updatedCustomer = this.clone();
    updatedCustomer._outstandingBalance = this._outstandingBalance.subtract(amount);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Record payment
   */
  public recordPayment(amount: Money, userId: string): Customer {
    this.ensureSameCurrency(amount);

    if (amount.greaterThan(this._outstandingBalance)) {
      throw new CustomerValidationError('Payment amount cannot exceed outstanding balance');
    }

    const updatedCustomer = this.clone();
    updatedCustomer._outstandingBalance = this._outstandingBalance.subtract(amount);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  // Purchase History Management

  /**
   * Record new purchase
   */
  public recordPurchase(orderId: string, orderDate: Date, totalAmount: Money, userId: string): Customer {
    this.ensureSameCurrency(totalAmount);

    const purchaseEntry: PurchaseHistoryEntry = {
      orderId,
      orderDate,
      totalAmount,
      paymentStatus: 'PENDING',
    };

    const updatedCustomer = this.clone();
    updatedCustomer._purchaseHistory.push(purchaseEntry);
    updatedCustomer._lastOrderDate = orderDate;
    updatedCustomer._totalOrdersCount += 1;
    updatedCustomer._totalOrdersValue = this._totalOrdersValue.add(totalAmount);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  // Update Methods

  /**
   * Update basic customer information
   */
  public updateBasicInfo(
    updates: {
      companyName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      mobile?: string;
      taxNumber?: string;
      website?: string;
      notes?: string;
    },
    userId: string
  ): Customer {
    const updatedCustomer = this.clone();

    if (updates.companyName !== undefined) {
      this.validateCompanyName(updates.companyName);
      updatedCustomer._companyName = updates.companyName || null;
    }

    if (updates.firstName !== undefined) {
      this.validateName(updates.firstName, 'First name');
      updatedCustomer._firstName = updates.firstName;
    }

    if (updates.lastName !== undefined) {
      this.validateName(updates.lastName, 'Last name');
      updatedCustomer._lastName = updates.lastName;
    }

    if (updates.phone !== undefined) {
      this.validatePhone(updates.phone);
      updatedCustomer._phone = updates.phone || null;
    }

    if (updates.mobile !== undefined) {
      this.validatePhone(updates.mobile);
      updatedCustomer._mobile = updates.mobile || null;
    }

    if (updates.taxNumber !== undefined) {
      this.validateTaxNumber(updates.taxNumber);
      updatedCustomer._taxNumber = updates.taxNumber || null;
    }

    if (updates.website !== undefined) {
      this.validateWebsite(updates.website);
      updatedCustomer._website = updates.website || null;
    }

    if (updates.notes !== undefined) {
      updatedCustomer._notes = updates.notes || null;
    }

    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Update email address
   */
  public updateEmail(newEmail: Email, userId: string): Customer {
    const updatedCustomer = this.clone();
    updatedCustomer._email = newEmail;
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Update payment terms
   */
  public updatePaymentTerms(newTerms: PaymentTerms, userId: string): Customer {
    const updatedCustomer = this.clone();
    updatedCustomer._paymentTerms = newTerms;
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Update addresses
   */
  public updateAddresses(newAddresses: CustomerAddress[], userId: string): Customer {
    this.validateAddresses(newAddresses);

    const updatedCustomer = this.clone();
    updatedCustomer._addresses = [...newAddresses];
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Add new address
   */
  public addAddress(address: CustomerAddress, userId: string): Customer {
    this.validateAddress(address);

    const updatedCustomer = this.clone();
    updatedCustomer._addresses.push(address);
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  /**
   * Update contacts
   */
  public updateContacts(newContacts: CustomerContact[], userId: string): Customer {
    this.validateContacts(newContacts);

    const updatedCustomer = this.clone();
    updatedCustomer._contacts = [...newContacts];
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();

    return updatedCustomer;
  }

  // Utility Methods

  /**
   * Convert to persistence format
   */
  public toPersistence(): CustomerPersistence {
    return {
      id: this._id,
      customerCode: this._customerCode,
      companyName: this._companyName,
      firstName: this._firstName,
      lastName: this._lastName,
      fullName: this.fullName,
      customerType: this._customerType,
      status: this._status,
      email: this._email.value,
      phone: this._phone,
      mobile: this._mobile,
      addresses: [...this._addresses],
      contacts: [...this._contacts],
      creditLimit: this._creditLimit.amount,
      creditLimitCurrency: this._creditLimit.currency,
      outstandingBalance: this._outstandingBalance.amount,
      outstandingBalanceCurrency: this._outstandingBalance.currency,
      availableCredit: this.availableCredit.amount,
      paymentTerms: this._paymentTerms,
      taxNumber: this._taxNumber,
      website: this._website,
      notes: this._notes,
      lastOrderDate: this._lastOrderDate,
      totalOrdersCount: this._totalOrdersCount,
      totalOrdersValue: this._totalOrdersValue.amount,
      averageOrderValue: this.averageOrderValue.amount,
      agencyId: this._agencyId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedBy: this._updatedBy,
      updatedAt: this._updatedAt,
      purchaseHistory: [...this._purchaseHistory],
      creditLimitHistory: [...this._creditLimitHistory],
    };
  }

  /**
   * Get display information (safe for UI)
   */
  public getDisplayInfo() {
    return {
      id: this._id,
      customerCode: this._customerCode,
      fullName: this.fullName,
      companyName: this._companyName,
      customerType: this._customerType,
      status: this._status,
      email: this._email.value,
      creditLimit: this._creditLimit.toString(),
      availableCredit: this.availableCredit.toString(),
      creditUtilization: this.getCreditUtilization(),
      totalOrdersCount: this._totalOrdersCount,
      totalOrdersValue: this._totalOrdersValue.toString(),
      averageOrderValue: this.averageOrderValue.toString(),
      lastOrderDate: this._lastOrderDate,
      daysSinceLastOrder: this.getDaysSinceLastOrder(),
      canPlaceOrders: this.canPlaceOrders(),
      hasOverduePayments: this.hasOverduePayments(),
      defaultAddress: this.getDefaultAddress(),
      primaryContact: this.getPrimaryContact(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  // Private helper methods

  private updateStatus(newStatus: CustomerStatus, userId: string): Customer {
    const updatedCustomer = this.clone();
    updatedCustomer._status = newStatus;
    updatedCustomer._updatedBy = userId;
    updatedCustomer._updatedAt = new Date();
    return updatedCustomer;
  }

  private clone(): Customer {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);

    // Deep clone arrays and objects
    cloned._addresses = [...this._addresses];
    cloned._contacts = [...this._contacts];
    cloned._purchaseHistory = [...this._purchaseHistory];
    cloned._creditLimitHistory = [...this._creditLimitHistory];

    return cloned;
  }

  private generateId(): string {
    return 'cust_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private ensureSameCurrency(money: Money): void {
    if (this._creditLimit.currency !== money.currency) {
      throw new CustomerValidationError(
        `Currency mismatch: expected ${this._creditLimit.currency}, got ${money.currency}`
      );
    }
  }

  // Validation methods

  private validate(): void {
    this.validateCustomerCode(this._customerCode);
    this.validateName(this._firstName, 'First name');
    this.validateName(this._lastName, 'Last name');

    if (this._companyName) {
      this.validateCompanyName(this._companyName);
    }

    if (this._phone) {
      this.validatePhone(this._phone);
    }

    if (this._mobile) {
      this.validatePhone(this._mobile);
    }

    if (this._taxNumber) {
      this.validateTaxNumber(this._taxNumber);
    }

    if (this._website) {
      this.validateWebsite(this._website);
    }

    if (this._creditLimit.isNegative()) {
      throw new CustomerValidationError('Credit limit cannot be negative');
    }

    this.validateAddresses(this._addresses);
    this.validateContacts(this._contacts);
  }

  private validateCustomerCode(customerCode: string): void {
    if (!customerCode || customerCode.trim().length === 0) {
      throw new InvalidCustomerCodeError('Customer code cannot be empty');
    }

    if (customerCode.length > 30) {
      throw new InvalidCustomerCodeError('Customer code cannot exceed 30 characters');
    }

    // Allow alphanumeric, hyphens, underscores
    if (!/^[A-Za-z0-9\-_]+$/.test(customerCode)) {
      throw new InvalidCustomerCodeError('Customer code can only contain letters, numbers, hyphens, and underscores');
    }
  }

  private validateName(name: string, fieldName: string): void {
    if (!name || name.trim().length === 0) {
      throw new CustomerValidationError(`${fieldName} cannot be empty`);
    }

    if (name.length > 50) {
      throw new CustomerValidationError(`${fieldName} cannot exceed 50 characters`);
    }
  }

  private validateCompanyName(companyName: string): void {
    if (companyName && companyName.length > 100) {
      throw new CustomerValidationError('Company name cannot exceed 100 characters');
    }
  }

  private validatePhone(phone: string): void {
    if (phone && phone.length > 20) {
      throw new CustomerValidationError('Phone number cannot exceed 20 characters');
    }
  }

  private validateTaxNumber(taxNumber: string): void {
    if (taxNumber && taxNumber.length > 30) {
      throw new CustomerValidationError('Tax number cannot exceed 30 characters');
    }
  }

  private validateWebsite(website: string): void {
    if (website && website.length > 100) {
      throw new CustomerValidationError('Website URL cannot exceed 100 characters');
    }

    if (website && !website.match(/^https?:\/\/.+/)) {
      throw new CustomerValidationError('Website must be a valid URL starting with http:// or https://');
    }
  }

  private validateAddresses(addresses: CustomerAddress[]): void {
    if (addresses.length === 0) {
      throw new InvalidAddressError('At least one address is required');
    }

    if (addresses.length > 10) {
      throw new InvalidAddressError('Cannot have more than 10 addresses');
    }

    const defaultAddresses = addresses.filter((addr) => addr.isDefault);
    if (defaultAddresses.length > 1) {
      throw new InvalidAddressError('Only one address can be marked as default');
    }

    addresses.forEach((address) => this.validateAddress(address));
  }

  private validateAddress(address: CustomerAddress): void {
    if (!address.street || address.street.trim().length === 0) {
      throw new InvalidAddressError('Street address is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      throw new InvalidAddressError('City is required');
    }

    if (!address.state || address.state.trim().length === 0) {
      throw new InvalidAddressError('State is required');
    }

    if (!address.country || address.country.trim().length === 0) {
      throw new InvalidAddressError('Country is required');
    }

    if (address.street.length > 100) {
      throw new InvalidAddressError('Street address cannot exceed 100 characters');
    }

    if (address.city.length > 50) {
      throw new InvalidAddressError('City cannot exceed 50 characters');
    }
  }

  private validateContacts(contacts: CustomerContact[]): void {
    if (contacts.length > 10) {
      throw new CustomerValidationError('Cannot have more than 10 contacts');
    }

    const primaryContacts = contacts.filter((contact) => contact.isPrimary);
    if (primaryContacts.length > 1) {
      throw new CustomerValidationError('Only one contact can be marked as primary');
    }

    contacts.forEach((contact) => this.validateContact(contact));
  }

  private validateContact(contact: CustomerContact): void {
    if (!contact.name || contact.name.trim().length === 0) {
      throw new CustomerValidationError('Contact name is required');
    }

    if (contact.name.length > 50) {
      throw new CustomerValidationError('Contact name cannot exceed 50 characters');
    }

    if (contact.title && contact.title.length > 50) {
      throw new CustomerValidationError('Contact title cannot exceed 50 characters');
    }

    if (contact.phone && contact.phone.length > 20) {
      throw new CustomerValidationError('Contact phone cannot exceed 20 characters');
    }

    if (contact.mobile && contact.mobile.length > 20) {
      throw new CustomerValidationError('Contact mobile cannot exceed 20 characters');
    }
  }
}
