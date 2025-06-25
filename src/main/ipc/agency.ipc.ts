/**
 * Agency IPC Handler - Step 1: Core Handler
 *
 * Secure IPC bridge for agency operations in Electron main process.
 * This is the minimal functional piece establishing the foundation for agency operations.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Agency Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { IAgencyRepository } from '../../domain/repositories/agency.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { CreateAgencyHandler } from '../../application/handlers/agency/create-agency.handler';
import { GetAgenciesHandler } from '../../application/handlers/agency/get-agencies.handler';
import { GetAgencyByIdHandler } from '../../application/handlers/agency/get-agency-by-id.handler';
import { UpdateAgencyHandler } from '../../application/handlers/agency/update-agency.handler';
import { AgencyStatus } from '../../domain/entities/agency';
import { GetAgenciesQuery } from '../../application/queries/agency/get-agencies.query';
import { GetAgencyByIdQuery } from '../../application/queries/agency/get-agency-by-id.query';

/**
 * Agency operation types for IPC
 */
export type AgencyOperation = 'get-agencies' | 'get-agency-by-id' | 'create-agency' | 'update-agency';

/**
 * Base response interface for all agency IPC operations
 */
export interface AgencyIpcResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
  readonly timestamp: number;
  readonly operation: AgencyOperation;
  readonly duration: number;
}

/**
 * Get agencies request schema for IPC validation
 */
export const GetAgenciesRequestSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'contactPerson', 'status', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Filtering options
  status: z.nativeEnum(AgencyStatus).optional(),
  search: z.string().max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional(),

  // Date range filtering
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),

  // Business settings filters
  allowsCreditSales: z.boolean().optional(),
  enablesInventoryTracking: z.boolean().optional(),

  // Authorization context
  requestedBy: z.string().uuid(),

  // Multi-tenant context
  agencyId: z.string().uuid().optional(),
});

/**
 * Get agency by ID request schema for IPC validation
 */
export const GetAgencyByIdRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  requestedBy: z.string().uuid('Invalid user ID format'),
  includeSettings: z.boolean().default(false),
  includeStats: z.boolean().default(false),
});

/**
 * Create agency request schema for IPC validation
 */
export const CreateAgencyRequestSchema = z.object({
  name: z.string().min(1).max(255),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  databasePath: z.string().min(1),

  // Business settings
  allowCreditSales: z.boolean().default(false),
  defaultCreditDays: z.number().int().min(0).max(365).default(30),
  maxCreditLimit: z.number().min(0).default(0),
  requireApprovalForOrders: z.boolean().default(false),
  enableInventoryTracking: z.boolean().default(true),
  taxRate: z.number().min(0).max(1).default(0),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .default('USD'),

  // Business hours
  businessHoursStart: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('09:00'),
  businessHoursEnd: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('17:00'),
  businessHoursTimezone: z.string().default('UTC'),

  // Notification settings
  notificationsLowStock: z.boolean().default(true),
  notificationsOverduePayments: z.boolean().default(true),
  notificationsNewOrders: z.boolean().default(false),

  // Authorization context
  requestedBy: z.string().uuid(),
});

/**
 * Update agency request schema for IPC validation
 */
export const UpdateAgencyRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),

  name: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(100, 'Agency name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&'().,!?-]+$/, 'Agency name contains invalid characters')
    .optional(),

  contactPerson: z
    .string()
    .max(100, 'Contact person name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]*$/, 'Contact person name contains invalid characters')
    .nullable()
    .optional(),

  phone: z
    .string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s()+.-]*$/, 'Phone number contains invalid characters')
    .nullable()
    .optional(),

  email: z.string().email('Invalid email format').max(255, 'Email too long').nullable().optional(),

  address: z.string().max(500, 'Address too long').nullable().optional(),

  // Business settings - optional for updates
  allowCreditSales: z.boolean().optional(),
  defaultCreditDays: z
    .number()
    .int('Credit days must be an integer')
    .min(1, 'Credit days must be at least 1')
    .max(365, 'Credit days cannot exceed 365')
    .optional(),
  maxCreditLimit: z.number().min(0, 'Credit limit cannot be negative').max(1000000, 'Credit limit too high').optional(),
  requireApprovalForOrders: z.boolean().optional(),
  enableInventoryTracking: z.boolean().optional(),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(1, 'Tax rate cannot exceed 100%').optional(),
  currency: z
    .string()
    .length(3, 'Currency must be 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code')
    .optional(),

  // Business hours - optional for updates
  businessHoursStart: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional(),
  businessHoursEnd: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional(),
  businessHoursTimezone: z.string().min(1, 'Timezone is required').optional(),

  // Notification settings - optional for updates
  notificationsLowStock: z.boolean().optional(),
  notificationsOverduePayments: z.boolean().optional(),
  notificationsNewOrders: z.boolean().optional(),

  // Status update
  status: z.nativeEnum(AgencyStatus).optional(),

  // Authorization context - required
  updatedBy: z.string().uuid('Invalid user ID format'),

  // Optional reason for update
  reason: z.string().min(1, 'Update reason is required').max(500, 'Update reason too long').optional(),
});

/**
 * Response types for each operation
 */
export interface GetAgenciesResponse {
  readonly agencies: readonly any[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly searchCriteria: any;
}

export interface GetAgencyByIdResponse {
  readonly agency: any | null;
}

export interface CreateAgencyResponse {
  readonly agencyId: string;
  readonly name: string;
  readonly message: string;
}

export interface UpdateAgencyResponse {
  readonly agencyId: string;
  readonly agencyName: string;
  readonly isOperational: boolean;
  readonly message: string;
}

/**
 * Agency IPC error class
 */
export class AgencyIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AgencyIpcError';
  }
}

/**
 * Agency IPC Handler
 *
 * Handles all agency-related IPC communications with security-first design.
 * Implements input validation, error handling, and proper response formatting.
 */
export class AgencyIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createAgencyHandler: CreateAgencyHandler;
  private readonly getAgenciesHandler: GetAgenciesHandler;
  private readonly getAgencyByIdHandler: GetAgencyByIdHandler;
  private readonly updateAgencyHandler: UpdateAgencyHandler;

  private readonly allowedChannels: readonly string[] = [
    'agency:get-agencies',
    'agency:get-agency-by-id',
    'agency:create-agency',
    'agency:update-agency',
  ] as const;

  /**
   * Private constructor to enforce factory pattern and dependency injection
   * @param agencyRepository - Agency repository for data operations
   * @param userRepository - User repository for authorization
   * @private
   */
  private constructor(
    private readonly agencyRepository: IAgencyRepository,
    private readonly userRepository: IUserRepository
  ) {
    this.validateRepositories(agencyRepository, userRepository);

    // Initialize application layer handlers
    this.createAgencyHandler = new CreateAgencyHandler(agencyRepository, userRepository);
    this.getAgenciesHandler = new GetAgenciesHandler(agencyRepository, userRepository);
    this.getAgencyByIdHandler = new GetAgencyByIdHandler(agencyRepository, userRepository);
    this.updateAgencyHandler = new UpdateAgencyHandler(agencyRepository, userRepository);
  }

  /**
   * Factory method to create AgencyIpcHandler instance
   * @param agencyRepository - Agency repository for data operations
   * @param userRepository - User repository for authorization
   * @returns AgencyIpcHandler instance
   */
  public static create(agencyRepository: IAgencyRepository, userRepository: IUserRepository): AgencyIpcHandler {
    return new AgencyIpcHandler(agencyRepository, userRepository);
  }

  /**
   * Registers all agency IPC handlers
   * @throws {AgencyIpcError} When handler registration fails
   */
  public registerHandlers(): void {
    try {
      // Register each agency operation handler
      ipcMain.handle('agency:get-agencies', this.handleGetAgencies.bind(this));
      ipcMain.handle('agency:get-agency-by-id', this.handleGetAgencyById.bind(this));
      ipcMain.handle('agency:create-agency', this.handleCreateAgency.bind(this));
      ipcMain.handle('agency:update-agency', this.handleUpdateAgency.bind(this));

      // Track registered channels
      this.allowedChannels.forEach((channel) => this.registeredChannels.add(channel));
    } catch (error) {
      throw new AgencyIpcError(
        'Failed to register agency IPC handlers',
        'AGENCY_HANDLER_REGISTRATION_ERROR',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Unregisters all agency IPC handlers
   */
  public unregisterHandlers(): void {
    this.allowedChannels.forEach((channel) => {
      ipcMain.removeHandler(channel);
      this.registeredChannels.delete(channel);
    });
  }

  /**
   * Gets handler statistics for monitoring
   * @returns Handler statistics
   */
  public getStats(): { registeredChannels: number; allowedChannels: number } {
    return {
      registeredChannels: this.registeredChannels.size,
      allowedChannels: this.allowedChannels.length,
    };
  }

  /**
   * Handles get agencies IPC requests
   * @private
   */
  private async handleGetAgencies(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AgencyIpcResponse<GetAgenciesResponse>> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input
      const validatedRequest = GetAgenciesRequestSchema.parse(request || {});

      // Step 2: Convert to application query
      const query: GetAgenciesQuery = {
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder,
        requestedBy: validatedRequest.requestedBy,
        ...(validatedRequest.status && { status: validatedRequest.status }),
        ...(validatedRequest.search && { search: validatedRequest.search }),
        ...(validatedRequest.contactPerson && { contactPerson: validatedRequest.contactPerson }),
        ...(validatedRequest.currency && { currency: validatedRequest.currency }),
        ...(validatedRequest.createdAfter && { createdAfter: validatedRequest.createdAfter }),
        ...(validatedRequest.createdBefore && { createdBefore: validatedRequest.createdBefore }),
        ...(validatedRequest.updatedAfter && { updatedAfter: validatedRequest.updatedAfter }),
        ...(validatedRequest.updatedBefore && { updatedBefore: validatedRequest.updatedBefore }),
        ...(validatedRequest.allowsCreditSales !== undefined && {
          allowsCreditSales: validatedRequest.allowsCreditSales,
        }),
        ...(validatedRequest.enablesInventoryTracking !== undefined && {
          enablesInventoryTracking: validatedRequest.enablesInventoryTracking,
        }),
        ...(validatedRequest.agencyId && { agencyId: validatedRequest.agencyId }),
      };

      // Step 3: Execute query through application handler
      const result = await this.getAgenciesHandler.handle(query);

      // Step 4: Handle application layer errors
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to retrieve agencies',
          ...(result.validationErrors && { validationErrors: result.validationErrors }),
          timestamp: Date.now(),
          operation: 'get-agencies',
          duration: Date.now() - startTime,
        };
      }

      // Step 5: Return success response
      const response: GetAgenciesResponse = {
        agencies: result.agencies,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
        searchCriteria: result.searchCriteria,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'get-agencies',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'get-agencies', startTime);
    }
  }

  /**
   * Handles get agency by ID IPC requests
   * @private
   */
  private async handleGetAgencyById(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AgencyIpcResponse<GetAgencyByIdResponse>> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input
      const validatedRequest = GetAgencyByIdRequestSchema.parse(request);

      // Step 2: Convert to application query
      const query: GetAgencyByIdQuery = {
        agencyId: validatedRequest.agencyId,
        requestedBy: validatedRequest.requestedBy,
        includeSettings: validatedRequest.includeSettings,
        includeStats: validatedRequest.includeStats,
      };

      // Step 3: Execute query through application handler
      const result = await this.getAgencyByIdHandler.handle(query);

      // Step 4: Handle application layer errors
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to retrieve agency',
          timestamp: Date.now(),
          operation: 'get-agency-by-id',
          duration: Date.now() - startTime,
        };
      }

      // Step 5: Return success response
      const response: GetAgencyByIdResponse = {
        agency: result.agency,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'get-agency-by-id',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'get-agency-by-id', startTime);
    }
  }

  /**
   * Handles create agency IPC requests
   * @private
   */
  private async handleCreateAgency(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AgencyIpcResponse<CreateAgencyResponse>> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input
      const validatedRequest = CreateAgencyRequestSchema.parse(request);

      // Step 2: Convert to application command
      const command = {
        name: validatedRequest.name,
        databasePath: validatedRequest.databasePath,
        contactPerson: validatedRequest.contactPerson,
        email: validatedRequest.email,
        phone: validatedRequest.phone,
        address: validatedRequest.address,
        settings: {
          allowCreditSales: validatedRequest.allowCreditSales,
          defaultCreditDays: validatedRequest.defaultCreditDays,
          maxCreditLimit: validatedRequest.maxCreditLimit,
          requireApprovalForOrders: validatedRequest.requireApprovalForOrders,
          enableInventoryTracking: validatedRequest.enableInventoryTracking,
          taxRate: validatedRequest.taxRate,
          currency: validatedRequest.currency,
          businessHours: {
            start: validatedRequest.businessHoursStart,
            end: validatedRequest.businessHoursEnd,
            timezone: validatedRequest.businessHoursTimezone,
          },
          notifications: {
            lowStock: validatedRequest.notificationsLowStock,
            overduePayments: validatedRequest.notificationsOverduePayments,
            newOrders: validatedRequest.notificationsNewOrders,
          },
        },
        createdBy: validatedRequest.requestedBy,
      };

      // Step 3: Execute command through application handler
      const result = await this.createAgencyHandler.handle(command);

      // Step 4: Handle application layer errors
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create agency',
          timestamp: Date.now(),
          operation: 'create-agency',
          duration: Date.now() - startTime,
        };
      }

      // Step 5: Return success response
      const response: CreateAgencyResponse = {
        agencyId: result.agencyId!,
        name: validatedRequest.name,
        message: 'Agency created successfully',
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'create-agency',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'create-agency', startTime);
    }
  }

  /**
   * Handles update agency IPC requests
   * @private
   */
  private async handleUpdateAgency(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AgencyIpcResponse<UpdateAgencyResponse>> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input
      const validatedRequest = UpdateAgencyRequestSchema.parse(request);

      // Step 2: Convert to application command
      const command: any = {
        agencyId: validatedRequest.agencyId,
        updatedBy: validatedRequest.updatedBy,
      };

      // Add optional fields only if provided
      if (validatedRequest.name !== undefined) command.name = validatedRequest.name;
      if (validatedRequest.contactPerson !== undefined) command.contactPerson = validatedRequest.contactPerson;
      if (validatedRequest.phone !== undefined) command.phone = validatedRequest.phone;
      if (validatedRequest.email !== undefined) command.email = validatedRequest.email;
      if (validatedRequest.address !== undefined) command.address = validatedRequest.address;
      if (validatedRequest.status !== undefined) command.status = validatedRequest.status;
      if (validatedRequest.reason !== undefined) command.reason = validatedRequest.reason;

      // Add settings only if any setting field is provided
      const hasSettings =
        validatedRequest.allowCreditSales !== undefined ||
        validatedRequest.defaultCreditDays !== undefined ||
        validatedRequest.maxCreditLimit !== undefined ||
        validatedRequest.requireApprovalForOrders !== undefined ||
        validatedRequest.enableInventoryTracking !== undefined ||
        validatedRequest.taxRate !== undefined ||
        validatedRequest.currency !== undefined ||
        validatedRequest.businessHoursStart !== undefined ||
        validatedRequest.businessHoursEnd !== undefined ||
        validatedRequest.businessHoursTimezone !== undefined ||
        validatedRequest.notificationsLowStock !== undefined ||
        validatedRequest.notificationsOverduePayments !== undefined ||
        validatedRequest.notificationsNewOrders !== undefined;

      if (hasSettings) {
        command.settings = {};
        if (validatedRequest.allowCreditSales !== undefined)
          command.settings.allowCreditSales = validatedRequest.allowCreditSales;
        if (validatedRequest.defaultCreditDays !== undefined)
          command.settings.defaultCreditDays = validatedRequest.defaultCreditDays;
        if (validatedRequest.maxCreditLimit !== undefined)
          command.settings.maxCreditLimit = validatedRequest.maxCreditLimit;
        if (validatedRequest.requireApprovalForOrders !== undefined)
          command.settings.requireApprovalForOrders = validatedRequest.requireApprovalForOrders;
        if (validatedRequest.enableInventoryTracking !== undefined)
          command.settings.enableInventoryTracking = validatedRequest.enableInventoryTracking;
        if (validatedRequest.taxRate !== undefined) command.settings.taxRate = validatedRequest.taxRate;
        if (validatedRequest.currency !== undefined) command.settings.currency = validatedRequest.currency;

        // Add business hours if any field is provided
        if (
          validatedRequest.businessHoursStart !== undefined ||
          validatedRequest.businessHoursEnd !== undefined ||
          validatedRequest.businessHoursTimezone !== undefined
        ) {
          command.settings.businessHours = {};
          if (validatedRequest.businessHoursStart !== undefined)
            command.settings.businessHours.start = validatedRequest.businessHoursStart;
          if (validatedRequest.businessHoursEnd !== undefined)
            command.settings.businessHours.end = validatedRequest.businessHoursEnd;
          if (validatedRequest.businessHoursTimezone !== undefined)
            command.settings.businessHours.timezone = validatedRequest.businessHoursTimezone;
        }

        // Add notifications if any field is provided
        if (
          validatedRequest.notificationsLowStock !== undefined ||
          validatedRequest.notificationsOverduePayments !== undefined ||
          validatedRequest.notificationsNewOrders !== undefined
        ) {
          command.settings.notifications = {};
          if (validatedRequest.notificationsLowStock !== undefined)
            command.settings.notifications.lowStock = validatedRequest.notificationsLowStock;
          if (validatedRequest.notificationsOverduePayments !== undefined)
            command.settings.notifications.overduePayments = validatedRequest.notificationsOverduePayments;
          if (validatedRequest.notificationsNewOrders !== undefined)
            command.settings.notifications.newOrders = validatedRequest.notificationsNewOrders;
        }
      }

      // Step 3: Execute command through application handler
      const result = await this.updateAgencyHandler.handle(command);

      // Step 4: Handle application layer errors
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update agency',
          timestamp: Date.now(),
          operation: 'update-agency',
          duration: Date.now() - startTime,
        };
      }

      // Step 5: Return success response
      const response: UpdateAgencyResponse = {
        agencyId: result.agencyId!,
        agencyName: result.agencyName!,
        isOperational: result.isOperational!,
        message: `Agency '${result.agencyName}' updated successfully`,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation: 'update-agency',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'update-agency', startTime);
    }
  }

  /**
   * Validates repository dependencies
   * @private
   */
  private validateRepositories(agencyRepository: IAgencyRepository, userRepository: IUserRepository): void {
    if (!agencyRepository) {
      throw new AgencyIpcError('Agency repository is required', 'AGENCY_REPOSITORY_REQUIRED');
    }
    if (!userRepository) {
      throw new AgencyIpcError('User repository is required', 'USER_REPOSITORY_REQUIRED');
    }
  }

  /**
   * Creates safe error response without exposing sensitive information
   * @private
   */
  private getSafeErrorResponse(error: Error, operation: AgencyOperation, startTime: number): AgencyIpcResponse {
    let errorMessage = 'An unexpected error occurred';
    let errorCode = 'AGENCY_UNKNOWN_ERROR';

    // Handle known error types
    if (error.name === 'ZodError') {
      errorMessage = 'Invalid input data';
      errorCode = 'AGENCY_VALIDATION_ERROR';
    } else if (
      error.message.includes('Creating user not found') ||
      error.message.includes('Requesting user not found')
    ) {
      errorMessage = 'User not found';
      errorCode = 'AGENCY_USER_NOT_FOUND';
    } else if (error.message.includes('Insufficient permissions')) {
      if (operation === 'create-agency') {
        errorMessage = 'Insufficient permissions to create agency';
      } else if (operation === 'get-agencies') {
        errorMessage = 'Insufficient permissions to view agencies';
      } else if (operation === 'get-agency-by-id') {
        errorMessage = 'Insufficient permissions to view agency details';
      } else {
        errorMessage = 'Insufficient permissions';
      }
      errorCode = 'AGENCY_INSUFFICIENT_PERMISSIONS';
    } else if (error.message.includes('Agency not found')) {
      errorMessage = 'Agency not found';
      errorCode = 'AGENCY_NOT_FOUND';
    } else if (error.message.includes('validation failed')) {
      errorMessage = 'Request validation failed';
      errorCode = 'AGENCY_VALIDATION_ERROR';
    }

    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`Agency IPC Error [${operation}]:`, {
        error: error.message,
        stack: error.stack,
        code: errorCode,
      });
    }

    return {
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
      operation,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Factory function to create AgencyIpcHandler
 * @param agencyRepository - Agency repository for data operations
 * @param userRepository - User repository for authorization
 * @returns AgencyIpcHandler instance
 */
export function createAgencyIpcHandler(
  agencyRepository: IAgencyRepository,
  userRepository: IUserRepository
): AgencyIpcHandler {
  return AgencyIpcHandler.create(agencyRepository, userRepository);
}
