/**
 * Customer IPC Handler - Step 1: Core Handler
 *
 * Secure IPC bridge for customer operations in Electron main process.
 * This is the minimal functional piece establishing the foundation for customer operations.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Customer Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { ICustomerRepository } from '../../domain/repositories/customer.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { CreateCustomerHandler } from '../../application/handlers/customer/create-customer.handler';
import { UpdateCustomerHandler } from '../../application/handlers/customer/update-customer.handler';
import { DeleteCustomerHandler } from '../../application/handlers/customer/delete-customer.handler';
import { GetCustomersHandler } from '../../application/handlers/customer/get-customers.handler';
import { CustomerType, CustomerStatus, PaymentTerms } from '../../domain/entities/customer';
import { CurrencyCode } from '../../domain/value-objects/money';

/**
 * Customer operation types for IPC
 */
export type CustomerOperation = 'get-customers' | 'create-customer' | 'update-customer' | 'delete-customer';

/**
 * Base IPC response interface
 */
export interface CustomerIpcResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
  readonly timestamp: number;
  readonly operation?: CustomerOperation;
  readonly duration?: number;
}

/**
 * Customer address interface for IPC
 */
export interface CustomerAddressRequest {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly isDefault?: boolean;
  readonly addressType?: 'BILLING' | 'SHIPPING' | 'BOTH';
}

/**
 * Customer contact interface for IPC
 */
export interface CustomerContactRequest {
  readonly name: string;
  readonly title?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly isPrimary: boolean;
}

/**
 * Create customer request interface
 */
export interface CreateCustomerRequest {
  readonly customerCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly companyName?: string;
  readonly customerType: CustomerType;
  readonly email: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly website?: string;
  readonly taxNumber?: string;
  readonly creditLimit: number;
  readonly creditLimitCurrency: string;
  readonly paymentTerms: PaymentTerms;
  readonly addresses: CustomerAddressRequest[];
  readonly contacts?: CustomerContactRequest[];
  readonly agencyId: string;
  readonly requestedBy: string;
}

/**
 * Update customer request interface
 */
export interface UpdateCustomerRequest {
  readonly customerId: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly companyName?: string;
  readonly customerType?: CustomerType;
  readonly email?: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly website?: string;
  readonly taxNumber?: string;
  readonly creditLimit?: number;
  readonly creditLimitCurrency?: string;
  readonly creditLimitChangeReason?: string;
  readonly paymentTerms?: PaymentTerms;
  readonly status?: CustomerStatus;
  readonly addresses?: CustomerAddressRequest[];
  readonly contacts?: CustomerContactRequest[];
  readonly requestedBy: string;
}

/**
 * Delete customer request interface
 */
export interface DeleteCustomerRequest {
  readonly customerId: string;
  readonly reason: string;
  readonly requestedBy: string;
}

/**
 * Get customers request interface
 */
export interface GetCustomersRequest {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'customerCode' | 'fullName' | 'companyName' | 'createdAt';
  readonly sortOrder?: 'asc' | 'desc';
  readonly agencyId?: string;
  readonly customerType?: CustomerType;
  readonly status?: CustomerStatus;
  readonly search?: string;
  readonly requestedBy: string;
}

/**
 * Customer response interface
 */
export interface CustomerResponse {
  readonly id: string;
  readonly customerCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly customerType: CustomerType;
  readonly status: CustomerStatus;
  readonly email: string;
  readonly phone: string | null;
  readonly mobile: string | null;
  readonly website: string | null;
  readonly taxNumber: string | null;
  readonly creditLimit: string;
  readonly paymentTerms: PaymentTerms;
  readonly addresses: CustomerAddressResponse[];
  readonly contacts: CustomerContactResponse[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string | null;
  readonly updatedAt: string | null;
  readonly outstandingBalance: string;
  readonly availableCredit: string;
  readonly creditUtilization: number;
  readonly isHighValue: boolean;
  readonly daysSinceLastOrder: number | null;
  readonly canPlaceOrders: boolean;
}

/**
 * Customer address response interface
 */
export interface CustomerAddressResponse {
  readonly id: string;
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly isDefault: boolean;
  readonly addressType?: 'BILLING' | 'SHIPPING' | 'BOTH';
}

/**
 * Customer contact response interface
 */
export interface CustomerContactResponse {
  readonly id: string;
  readonly name: string;
  readonly title: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly mobile: string | null;
  readonly isPrimary: boolean;
}

/**
 * Customer summary response interface (for list views)
 */
export interface CustomerSummaryResponse {
  readonly id: string;
  readonly customerCode: string;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly customerType: CustomerType;
  readonly status: CustomerStatus;
  readonly email: string;
  readonly creditLimit: string;
  readonly createdAt: string;
}

/**
 * Get customers response interface
 */
export interface GetCustomersResponse {
  readonly customers: CustomerSummaryResponse[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * Create customer response interface
 */
export interface CreateCustomerResponse {
  readonly customerId: string;
  readonly customerCode: string;
  readonly message: string;
}

/**
 * Update customer response interface
 */
export interface UpdateCustomerResponse {
  readonly customerId: string;
  readonly message: string;
  readonly updatedFields: string[];
}

/**
 * Delete customer response interface
 */
export interface DeleteCustomerResponse {
  readonly customerId: string;
  readonly message: string;
  readonly deletedAt: string;
}

/**
 * Input validation schemas using Zod for security
 */
const CustomerAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(1, 'State is required').max(100, 'State name too long'),
  zipCode: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name too long'),
  isDefault: z.boolean().optional(),
  addressType: z.enum(['BILLING', 'SHIPPING', 'BOTH']).optional(),
});

const CustomerContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100, 'Contact name too long'),
  title: z.string().max(100, 'Contact title too long').optional(),
  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  mobile: z.string().max(20, 'Mobile number too long').optional(),
  isPrimary: z.boolean(),
});

const CreateCustomerRequestSchema = z.object({
  customerCode: z
    .string()
    .min(1, 'Customer code is required')
    .max(30, 'Customer code too long')
    .regex(/^[A-Z0-9_-]+$/, 'Customer code contains invalid characters'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'Last name contains invalid characters'),
  companyName: z.string().max(100, 'Company name too long').optional(),
  customerType: z.nativeEnum(CustomerType, { required_error: 'Customer type is required' }),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  phone: z.string().max(20, 'Phone number too long').optional(),
  mobile: z.string().max(20, 'Mobile number too long').optional(),
  website: z.string().url('Invalid website URL').max(255, 'Website URL too long').optional(),
  taxNumber: z.string().max(50, 'Tax number too long').optional(),
  creditLimit: z.number().min(0, 'Credit limit cannot be negative').max(10000000, 'Credit limit too high'),
  creditLimitCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'PKR', 'INR'], {
    required_error: 'Currency code is required',
  }),
  paymentTerms: z.nativeEnum(PaymentTerms, { required_error: 'Payment terms are required' }),
  addresses: z.array(CustomerAddressSchema).min(1, 'At least one address is required').max(10, 'Too many addresses'),
  contacts: z.array(CustomerContactSchema).max(10, 'Too many contacts').optional(),
  agencyId: z.string().uuid('Invalid agency ID format'),
  requestedBy: z.string().uuid('Invalid requester ID format'),
});

const UpdateCustomerRequestSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'First name contains invalid characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'Last name contains invalid characters')
    .optional(),
  companyName: z.string().max(100, 'Company name too long').optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  mobile: z.string().max(20, 'Mobile number too long').optional(),
  website: z.string().url('Invalid website URL').max(255, 'Website URL too long').optional(),
  taxNumber: z.string().max(50, 'Tax number too long').optional(),
  creditLimit: z.number().min(0, 'Credit limit cannot be negative').max(10000000, 'Credit limit too high').optional(),
  creditLimitCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'PKR', 'INR']).optional(),
  creditLimitChangeReason: z.string().max(500, 'Credit limit change reason too long').optional(),
  paymentTerms: z.nativeEnum(PaymentTerms).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  addresses: z
    .array(CustomerAddressSchema)
    .min(1, 'At least one address is required')
    .max(10, 'Too many addresses')
    .optional(),
  contacts: z.array(CustomerContactSchema).max(10, 'Too many contacts').optional(),
  requestedBy: z.string().uuid('Invalid requester ID format'),
});

const DeleteCustomerRequestSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format'),
  reason: z.string().min(1, 'Deletion reason is required').max(500, 'Deletion reason too long'),
  requestedBy: z.string().uuid('Invalid requester ID format'),
});

const GetCustomersRequestSchema = z.object({
  limit: z.number().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(50),
  offset: z.number().min(0, 'Offset cannot be negative').default(0),
  sortBy: z.enum(['customerCode', 'fullName', 'companyName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  agencyId: z.string().uuid('Invalid agency ID format').optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  search: z.string().max(255, 'Search term too long').optional(),
  requestedBy: z.string().uuid('Invalid requester ID format'),
});

/**
 * Customer IPC error hierarchy
 */
export class CustomerIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CustomerIpcError';
  }
}

export class CustomerValidationError extends CustomerIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CUSTOMER_VALIDATION_ERROR', originalError);
    this.name = 'CustomerValidationError';
  }
}

export class CustomerSecurityError extends CustomerIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CUSTOMER_SECURITY_ERROR', originalError);
    this.name = 'CustomerSecurityError';
  }
}

export class CustomerOperationError extends CustomerIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CUSTOMER_OPERATION_ERROR', originalError);
    this.name = 'CustomerOperationError';
  }
}

export class CustomerNotFoundError extends CustomerIpcError {
  constructor(customerId: string, originalError?: Error) {
    super(`Customer with ID ${customerId} not found`, 'CUSTOMER_NOT_FOUND', originalError);
    this.name = 'CustomerNotFoundError';
  }
}

export class CustomerAlreadyExistsError extends CustomerIpcError {
  constructor(customerCode: string, originalError?: Error) {
    super(`Customer with code ${customerCode} already exists`, 'CUSTOMER_ALREADY_EXISTS', originalError);
    this.name = 'CustomerAlreadyExistsError';
  }
}

/**
 * Customer IPC Handler - Core Implementation
 *
 * Handles customer operations through secure IPC channels.
 * Integrates with application layer handlers for real functionality.
 */
export class CustomerIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createCustomerHandler: CreateCustomerHandler;
  private readonly updateCustomerHandler: UpdateCustomerHandler;
  private readonly deleteCustomerHandler: DeleteCustomerHandler;
  private readonly getCustomersHandler: GetCustomersHandler;

  private readonly allowedChannels: readonly string[] = [
    'customer:get-customers',
    'customer:create-customer',
    'customer:update-customer',
    'customer:delete-customer',
  ] as const;

  /**
   * Creates Customer IPC Handler with repository dependency injection
   * @param customerRepository - Customer repository for data access
   * @param userRepository - User repository for authorization
   * @throws {CustomerIpcError} When repositories are invalid
   */
  private constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userRepository: IUserRepository
  ) {
    this.validateRepositories(customerRepository, userRepository);

    // Initialize application layer handlers
    this.createCustomerHandler = new CreateCustomerHandler(customerRepository, userRepository);
    this.updateCustomerHandler = new UpdateCustomerHandler(customerRepository, userRepository);
    this.deleteCustomerHandler = new DeleteCustomerHandler(customerRepository, userRepository);
    this.getCustomersHandler = new GetCustomersHandler(customerRepository, userRepository);
  }

  /**
   * Factory method to create CustomerIpcHandler instance
   * @param customerRepository - Customer repository implementation
   * @param userRepository - User repository implementation
   * @returns CustomerIpcHandler instance
   */
  public static create(customerRepository: ICustomerRepository, userRepository: IUserRepository): CustomerIpcHandler {
    return new CustomerIpcHandler(customerRepository, userRepository);
  }

  /**
   * Registers all customer IPC handlers
   * @throws {CustomerIpcError} When handler registration fails
   */
  public registerHandlers(): void {
    try {
      // Register each customer operation handler
      ipcMain.handle('customer:get-customers', this.handleGetCustomers.bind(this));
      ipcMain.handle('customer:create-customer', this.handleCreateCustomer.bind(this));
      ipcMain.handle('customer:update-customer', this.handleUpdateCustomer.bind(this));
      ipcMain.handle('customer:delete-customer', this.handleDeleteCustomer.bind(this));

      // Track registered channels
      this.allowedChannels.forEach((channel) => this.registeredChannels.add(channel));
    } catch (error) {
      throw new CustomerIpcError(
        'Failed to register customer IPC handlers',
        'CUSTOMER_HANDLER_REGISTRATION_ERROR',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Unregisters all customer IPC handlers
   */
  public unregisterHandlers(): void {
    this.allowedChannels.forEach((channel) => {
      ipcMain.removeHandler(channel);
      this.registeredChannels.delete(channel);
    });
  }

  /**
   * Handles get customers IPC requests
   * @private
   */
  private async handleGetCustomers(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<CustomerIpcResponse<GetCustomersResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = GetCustomersRequestSchema.parse(request);

      // Map IPC request to application query
      const query = {
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder,
        agencyId: validatedRequest.agencyId,
        customerType: validatedRequest.customerType,
        status: validatedRequest.status,
        search: validatedRequest.search,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute query through application layer
      const result = await this.getCustomersHandler.handle(query);

      // Convert result to IPC response format
      const response: GetCustomersResponse = {
        customers: result.customers.map((customer) => ({
          id: customer.id,
          customerCode: customer.customerCode,
          fullName: customer.fullName,
          companyName: customer.companyName,
          customerType: customer.customerType,
          status: customer.status,
          email: customer.email,
          creditLimit: customer.creditLimit,
          createdAt: customer.createdAt.toISOString(),
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'get-customers',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        'get-customers',
        startTime
      );
    }
  }

  /**
   * Handles create customer IPC requests
   * @private
   */
  private async handleCreateCustomer(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<CustomerIpcResponse<CreateCustomerResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = CreateCustomerRequestSchema.parse(request);

      // Map IPC request to application command
      const command = {
        customerCode: validatedRequest.customerCode,
        firstName: validatedRequest.firstName,
        lastName: validatedRequest.lastName,
        companyName: validatedRequest.companyName,
        customerType: validatedRequest.customerType,
        email: validatedRequest.email,
        phone: validatedRequest.phone,
        mobile: validatedRequest.mobile,
        website: validatedRequest.website,
        taxNumber: validatedRequest.taxNumber,
        creditLimit: validatedRequest.creditLimit,
        creditLimitCurrency: validatedRequest.creditLimitCurrency,
        paymentTerms: validatedRequest.paymentTerms,
        addresses: validatedRequest.addresses,
        contacts: validatedRequest.contacts,
        agencyId: validatedRequest.agencyId,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute command through application layer
      const customerId = await this.createCustomerHandler.handle(command);

      const response: CreateCustomerResponse = {
        customerId: customerId,
        customerCode: validatedRequest.customerCode,
        message: 'Customer created successfully',
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'create-customer',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        'create-customer',
        startTime
      );
    }
  }

  /**
   * Handles update customer IPC requests
   * @private
   */
  private async handleUpdateCustomer(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<CustomerIpcResponse<UpdateCustomerResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = UpdateCustomerRequestSchema.parse(request);

      // Map IPC request to application command
      const command = {
        customerId: validatedRequest.customerId,
        firstName: validatedRequest.firstName,
        lastName: validatedRequest.lastName,
        companyName: validatedRequest.companyName,
        customerType: validatedRequest.customerType,
        email: validatedRequest.email,
        phone: validatedRequest.phone,
        mobile: validatedRequest.mobile,
        website: validatedRequest.website,
        taxNumber: validatedRequest.taxNumber,
        creditLimit: validatedRequest.creditLimit,
        creditLimitCurrency: validatedRequest.creditLimitCurrency,
        creditLimitChangeReason: validatedRequest.creditLimitChangeReason,
        paymentTerms: validatedRequest.paymentTerms,
        status: validatedRequest.status,
        addresses: validatedRequest.addresses,
        contacts: validatedRequest.contacts,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute command through application layer
      const customerId = await this.updateCustomerHandler.handle(command);

      const response: UpdateCustomerResponse = {
        customerId: customerId,
        message: 'Customer updated successfully',
        updatedFields: [], // We don't track updated fields in the current handler
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'update-customer',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        'update-customer',
        startTime
      );
    }
  }

  /**
   * Handles delete customer IPC requests
   * @private
   */
  private async handleDeleteCustomer(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<CustomerIpcResponse<DeleteCustomerResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = DeleteCustomerRequestSchema.parse(request);

      // Map IPC request to application command
      const command = {
        customerId: validatedRequest.customerId,
        reason: validatedRequest.reason,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute command through application layer
      const customerId = await this.deleteCustomerHandler.handle(command);

      const response: DeleteCustomerResponse = {
        customerId: customerId,
        message: 'Customer deleted successfully',
        deletedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'delete-customer',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        'delete-customer',
        startTime
      );
    }
  }

  /**
   * Creates safe error response that doesn't expose sensitive information
   * @private
   */
  private getSafeErrorResponse(error: Error, operation: CustomerOperation, startTime: number): CustomerIpcResponse {
    const duration = Date.now() - startTime;

    // Handle validation errors
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: 'Invalid request data',
        code: 'CUSTOMER_VALIDATION_ERROR',
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    // Handle known customer errors
    if (error instanceof CustomerIpcError) {
      return {
        success: false,
        error: this.getSafeErrorMessage(error.message),
        code: error.code,
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    // Handle application layer errors
    if (error.message.includes('not found')) {
      return {
        success: false,
        error: 'Requested resource not found',
        code: 'CUSTOMER_NOT_FOUND',
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    if (error.message.includes('permission')) {
      return {
        success: false,
        error: 'Insufficient permissions',
        code: 'CUSTOMER_PERMISSION_DENIED',
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    if (error.message.includes('already exists')) {
      return {
        success: false,
        error: 'Customer already exists',
        code: 'CUSTOMER_ALREADY_EXISTS',
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    // Default error response
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'CUSTOMER_UNKNOWN_ERROR',
      timestamp: Date.now(),
      operation,
      duration,
    };
  }

  /**
   * Sanitizes error messages to prevent information disclosure
   * @private
   */
  private getSafeErrorMessage(message: string): string {
    // Remove potential sensitive information
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /secret/gi,
      /key/gi,
      /database/gi,
      /connection/gi,
      /internal/gi,
    ];

    let safeMessage = message;
    sensitivePatterns.forEach((pattern) => {
      safeMessage = safeMessage.replace(pattern, '[REDACTED]');
    });

    return safeMessage;
  }

  /**
   * Validates repository dependencies
   * @private
   */
  private validateRepositories(customerRepository: ICustomerRepository, userRepository: IUserRepository): void {
    if (!customerRepository) {
      throw new CustomerIpcError('Customer repository is required', 'CUSTOMER_REPOSITORY_MISSING');
    }

    if (!userRepository) {
      throw new CustomerIpcError('User repository is required', 'USER_REPOSITORY_MISSING');
    }

    // Validate repository interfaces
    const requiredCustomerMethods = ['save', 'update', 'findById', 'search', 'delete'];
    const requiredUserMethods = ['findById'];

    requiredCustomerMethods.forEach((method) => {
      if (typeof (customerRepository as any)[method] !== 'function') {
        throw new CustomerIpcError(
          `Customer repository missing required method: ${method}`,
          'CUSTOMER_REPOSITORY_INVALID'
        );
      }
    });

    requiredUserMethods.forEach((method) => {
      if (typeof (userRepository as any)[method] !== 'function') {
        throw new CustomerIpcError(`User repository missing required method: ${method}`, 'USER_REPOSITORY_INVALID');
      }
    });
  }

  /**
   * Gets handler statistics for monitoring
   */
  public getStats(): {
    readonly registeredChannels: readonly string[];
    readonly handlerCount: number;
  } {
    return {
      registeredChannels: Array.from(this.registeredChannels),
      handlerCount: this.registeredChannels.size,
    };
  }
}

/**
 * Factory function to create CustomerIpcHandler
 * @param customerRepository - Customer repository implementation
 * @param userRepository - User repository implementation
 * @returns CustomerIpcHandler instance
 */
export function createCustomerIpcHandler(
  customerRepository: ICustomerRepository,
  userRepository: IUserRepository
): CustomerIpcHandler {
  return CustomerIpcHandler.create(customerRepository, userRepository);
}
