/**
 * Lot/Batch IPC Handler
 *
 * Secure IPC bridge for lot/batch operations in Electron main process.
 * Provides comprehensive inventory management capabilities with proper
 * authorization, validation, and error handling.
 *
 * @domain Lot/Batch Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { ILotBatchRepository } from '../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { IAgencyRepository } from '../../domain/repositories/agency.repository';
import { CreateLotBatchHandler } from '../../application/handlers/lot-batch/create-lot-batch.handler';
import { GetLotBatchHandler } from '../../application/handlers/lot-batch/get-lot-batch.handler';
import { UpdateLotBatchHandler } from '../../application/handlers/lot-batch/update-lot-batch.handler';
import { DeleteLotBatchHandler } from '../../application/handlers/lot-batch/delete-lot-batch.handler';
import { ListLotBatchesHandler } from '../../application/handlers/lot-batch/list-lot-batches.handler';
import { SearchLotBatchesHandler } from '../../application/handlers/lot-batch/search-lot-batches.handler';
import { LotStatus } from '../../domain/value-objects/lot-batch';
import { DeleteType } from '../../application/commands/lot-batch/delete-lot-batch.command';
import {
  LotBatchDetails,
  LotBatchQuantityHistory,
  RelatedLotBatchSummary,
} from '../../application/queries/lot-batch/get-lot-batch.query';
import { LotBatchListItem } from '../../application/queries/lot-batch/list-lot-batches.query';
import { LotBatchSummary } from '../../application/queries/lot-batch/search-lot-batches.query';

/**
 * Lot/Batch operation types for IPC
 */
export type LotBatchOperation =
  | 'create-lot-batch'
  | 'get-lot-batch'
  | 'update-lot-batch'
  | 'delete-lot-batch'
  | 'list-lot-batches'
  | 'search-lot-batches';

/**
 * Base response interface for all lot/batch IPC operations
 */
export interface LotBatchIpcResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string | undefined;
  readonly validationErrors?: Record<string, string[]> | undefined;
  readonly timestamp: number;
  readonly operation: LotBatchOperation;
  readonly duration: number;
}

/**
 * Create lot/batch request schema for IPC validation
 */
export const CreateLotBatchRequestSchema = z.object({
  lotNumber: z
    .string()
    .min(1, 'Lot number is required')
    .max(50, 'Lot number too long')
    .regex(
      /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/,
      'Lot number must contain only uppercase letters, numbers, hyphens, and underscores'
    ),

  batchNumber: z
    .string()
    .max(50, 'Batch number too long')
    .regex(
      /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/,
      'Batch number must contain only uppercase letters, numbers, hyphens, and underscores'
    )
    .optional(),

  manufacturingDate: z
    .string()
    .datetime('Manufacturing date must be a valid ISO datetime')
    .transform((val) => new Date(val))
    .refine((date) => date <= new Date(), 'Manufacturing date cannot be in the future'),

  expiryDate: z
    .string()
    .datetime('Expiry date must be a valid ISO datetime')
    .transform((val) => new Date(val))
    .optional(),

  quantity: z
    .number()
    .positive('Quantity must be positive')
    .max(1000000, 'Quantity too large')
    .finite('Quantity must be a finite number'),

  productId: z.string().uuid('Invalid product ID format'),
  agencyId: z.string().uuid('Invalid agency ID format'),
  supplierId: z.string().uuid('Invalid supplier ID format').optional(),
  supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Get lot/batch request schema for IPC validation
 */
export const GetLotBatchRequestSchema = z.object({
  lotBatchId: z.string().uuid('Invalid lot/batch ID format'),
  requestedBy: z.string().uuid('Invalid requester ID format'),
  includeHistory: z.boolean().default(false),
  includeRelated: z.boolean().default(false),
  nearExpiryDays: z
    .number()
    .min(1, 'Near expiry days must be at least 1')
    .max(365, 'Near expiry days cannot exceed 1 year')
    .default(30),
});

/**
 * Create lot/batch response interface
 */
export interface CreateLotBatchResponse {
  readonly lotBatchId: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly message: string;
}

/**
 * Update lot/batch request schema for IPC validation
 */
export const UpdateLotBatchRequestSchema = z
  .object({
    lotBatchId: z.string().uuid('Invalid lot/batch ID format'),
    expiryDate: z
      .string()
      .datetime('Invalid expiry date format')
      .transform((str) => new Date(str))
      .optional(),
    status: z
      .nativeEnum(LotStatus, {
        errorMap: () => ({ message: 'Invalid lot status' }),
      })
      .optional(),
    supplierId: z.string().uuid('Invalid supplier ID format').optional(),
    supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    reason: z.string().min(5, 'Update reason must be at least 5 characters').max(500, 'Update reason too long'),
    requestedBy: z.string().uuid('Invalid user ID format'),
  })
  .refine(
    (data) => {
      // At least one field must be provided for update
      return (
        data.expiryDate !== undefined ||
        data.status !== undefined ||
        data.supplierId !== undefined ||
        data.supplierLotCode !== undefined ||
        data.notes !== undefined
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['_root'],
    }
  );

/**
 * Get lot/batch response interface
 */
export interface GetLotBatchResponse {
  readonly lotBatch: LotBatchDetails | null;
  readonly quantityHistory?: readonly LotBatchQuantityHistory[];
  readonly relatedLots?: readonly RelatedLotBatchSummary[];
  readonly metadata: {
    readonly includeHistory: boolean;
    readonly includeRelated: boolean;
    readonly nearExpiryThreshold: number;
  };
}

/**
 * Delete lot/batch request schema for IPC validation
 */
export const DeleteLotBatchRequestSchema = z.object({
  lotBatchId: z.string().uuid('Invalid lot/batch ID format'),
  deleteType: z
    .nativeEnum(DeleteType, {
      errorMap: () => ({ message: 'Invalid delete type' }),
    })
    .default(DeleteType.SOFT),
  reason: z.string().min(5, 'Deletion reason must be at least 5 characters long').max(500, 'Deletion reason too long'),
  force: z.boolean().default(false),
  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Update lot/batch response interface
 */
export interface UpdateLotBatchResponse {
  readonly lotBatchId: string;
  readonly updatedFields: string[];
  readonly message: string;
}

/**
 * List lot/batch request schema for IPC validation
 */
export const ListLotBatchRequestSchema = z
  .object({
    requestedBy: z.string().uuid('Invalid requester ID format'),
    productId: z.string().uuid('Invalid product ID format').optional(),
    agencyId: z.string().uuid('Invalid agency ID format').optional(),
    status: z.union([z.nativeEnum(LotStatus), z.array(z.nativeEnum(LotStatus))]).optional(),
    includeExpired: z.boolean().default(false),
    includeInactive: z.boolean().default(false),
    hasQuantityOnly: z.boolean().default(true),
    limit: z.number().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(50),
    offset: z.number().min(0, 'Offset cannot be negative').default(0),
    sortBy: z.enum(['manufacturingDate', 'expiryDate', 'lotNumber', 'remainingQuantity']).default('manufacturingDate'),
    sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
    fifoOrder: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // At least one of productId or agencyId must be provided
      return data.productId || data.agencyId;
    },
    {
      message: 'Either productId or agencyId must be provided',
      path: ['productId'],
    }
  );

/**
 * Delete lot/batch response interface
 */
export interface DeleteLotBatchResponse {
  readonly lotBatchId: string;
  readonly deleteType: DeleteType;
  readonly warning?: string;
  readonly message: string;
}

/**
 * List lot/batch response interface
 */
export interface ListLotBatchResponse {
  readonly lotBatches: readonly LotBatchListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly filters: {
    readonly productId?: string;
    readonly agencyId?: string;
    readonly statusFilter: string[];
    readonly includeExpired: boolean;
    readonly includeInactive: boolean;
    readonly hasQuantityOnly: boolean;
  };
  readonly sorting: {
    readonly sortBy: string;
    readonly sortOrder: string;
    readonly fifoOrder: boolean;
  };
}

/**
 * Search lot/batch request schema for IPC validation
 */
export const SearchLotBatchRequestSchema = z
  .object({
    // Pagination
    limit: z.number().min(1, 'Limit must be at least 1').max(10000, 'Limit cannot exceed 10000').default(100),
    offset: z.number().min(0, 'Offset cannot be negative').default(0),

    // Sorting
    sortBy: z
      .enum([
        'lotNumber',
        'batchNumber',
        'manufacturingDate',
        'expiryDate',
        'status',
        'remainingQuantity',
        'createdAt',
        'updatedAt',
      ])
      .default('manufacturingDate'),
    sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
    fifoOrder: z.boolean().default(false),

    // Required field
    requestedBy: z.string().uuid('Invalid requester ID format'),

    // Association filtering (UUID or array of UUIDs)
    productId: z
      .union([z.string().uuid('Invalid product ID format'), z.array(z.string().uuid('Invalid product ID format'))])
      .optional(),
    agencyId: z
      .union([z.string().uuid('Invalid agency ID format'), z.array(z.string().uuid('Invalid agency ID format'))])
      .optional(),
    supplierId: z
      .union([z.string().uuid('Invalid supplier ID format'), z.array(z.string().uuid('Invalid supplier ID format'))])
      .optional(),

    // Text search
    searchTerm: z.string().max(255, 'Search term too long').optional(),
    lotNumber: z.string().max(50, 'Lot number too long').optional(),
    batchNumber: z.string().max(50, 'Batch number too long').optional(),
    supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),

    // Status filtering
    status: z.union([z.nativeEnum(LotStatus), z.array(z.nativeEnum(LotStatus))]).optional(),
    isActive: z.boolean().optional(),
    isExpired: z.boolean().optional(),
    isAvailable: z.boolean().optional(),

    // Quantity filtering
    hasQuantity: z.boolean().optional(),
    minQuantity: z.number().min(0, 'Minimum quantity cannot be negative').optional(),
    maxQuantity: z.number().min(0, 'Maximum quantity cannot be negative').optional(),
    hasReservedQuantity: z.boolean().optional(),

    // Date range filtering
    manufacturingDateAfter: z.coerce.date().optional(),
    manufacturingDateBefore: z.coerce.date().optional(),
    expiryDateAfter: z.coerce.date().optional(),
    expiryDateBefore: z.coerce.date().optional(),
    createdAfter: z.coerce.date().optional(),
    createdBefore: z.coerce.date().optional(),
    updatedAfter: z.coerce.date().optional(),
    updatedBefore: z.coerce.date().optional(),

    // Expiry filtering
    expiringWithinDays: z
      .number()
      .min(0, 'Days cannot be negative')
      .max(3650, 'Days cannot exceed 10 years')
      .optional(),
    nearExpiryDays: z
      .number()
      .min(1, 'Near expiry days must be at least 1')
      .max(365, 'Near expiry days cannot exceed 1 year')
      .default(30),
  })
  .refine(
    (data) => {
      // Validate date ranges
      if (data.manufacturingDateAfter && data.manufacturingDateBefore) {
        return data.manufacturingDateAfter <= data.manufacturingDateBefore;
      }
      return true;
    },
    {
      message: 'Manufacturing date after must be before or equal to manufacturing date before',
      path: ['manufacturingDateAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate expiry date ranges
      if (data.expiryDateAfter && data.expiryDateBefore) {
        return data.expiryDateAfter <= data.expiryDateBefore;
      }
      return true;
    },
    {
      message: 'Expiry date after must be before or equal to expiry date before',
      path: ['expiryDateAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate quantity ranges
      if (data.minQuantity !== undefined && data.maxQuantity !== undefined) {
        return data.minQuantity <= data.maxQuantity;
      }
      return true;
    },
    {
      message: 'Minimum quantity must be less than or equal to maximum quantity',
      path: ['minQuantity'],
    }
  )
  .refine(
    (data) => {
      // Validate created date ranges
      if (data.createdAfter && data.createdBefore) {
        return data.createdAfter <= data.createdBefore;
      }
      return true;
    },
    {
      message: 'Created after date must be before or equal to created before date',
      path: ['createdAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate updated date ranges
      if (data.updatedAfter && data.updatedBefore) {
        return data.updatedAfter <= data.updatedBefore;
      }
      return true;
    },
    {
      message: 'Updated after date must be before or equal to updated before date',
      path: ['updatedAfter'],
    }
  );

/**
 * Search lot/batch response interface
 */
export interface SearchLotBatchResponse {
  readonly lotBatches: readonly LotBatchSummary[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly searchCriteria: {
    readonly appliedFilters: string[];
    readonly sortBy: string;
    readonly sortOrder: string;
    readonly fifoOrder: boolean;
  };
}

/**
 * Lot/Batch IPC Error class
 */
export class LotBatchIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LotBatchIpcError';
  }
}

/**
 * Lot/Batch IPC Handler Class
 */
export class LotBatchIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createLotBatchHandler: CreateLotBatchHandler;
  private readonly getLotBatchHandler: GetLotBatchHandler;
  private readonly updateLotBatchHandler: UpdateLotBatchHandler;
  private readonly deleteLotBatchHandler: DeleteLotBatchHandler;
  private readonly listLotBatchesHandler: ListLotBatchesHandler;
  private readonly searchLotBatchesHandler: SearchLotBatchesHandler;

  private readonly allowedChannels: readonly string[] = [
    'lot-batch:create',
    'lot-batch:get',
    'lot-batch:update',
    'lot-batch:delete',
    'lot-batch:list',
    'lot-batch:search',
  ] as const;

  private constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {
    // Validate repositories
    this.validateRepositories(lotBatchRepository, userRepository);

    // Initialize handlers
    this.createLotBatchHandler = new CreateLotBatchHandler(
      lotBatchRepository,
      userRepository,
      productRepository,
      agencyRepository
    );
    this.getLotBatchHandler = new GetLotBatchHandler(lotBatchRepository, userRepository);
    this.updateLotBatchHandler = new UpdateLotBatchHandler(lotBatchRepository, userRepository);
    this.deleteLotBatchHandler = new DeleteLotBatchHandler(lotBatchRepository, userRepository);
    this.listLotBatchesHandler = new ListLotBatchesHandler(lotBatchRepository, userRepository);
    this.searchLotBatchesHandler = new SearchLotBatchesHandler(lotBatchRepository, userRepository);
  }

  /**
   * Factory method to create LotBatchIpcHandler
   */
  public static create(
    lotBatchRepository: ILotBatchRepository,
    userRepository: IUserRepository,
    productRepository: IProductRepository,
    agencyRepository: IAgencyRepository
  ): LotBatchIpcHandler {
    return new LotBatchIpcHandler(lotBatchRepository, userRepository, productRepository, agencyRepository);
  }

  /**
   * Register all IPC handlers
   */
  public registerHandlers(): void {
    try {
      // Register create handler
      this.registerHandler('lot-batch:create', this.handleCreateLotBatch.bind(this));

      // Register get handler
      this.registerHandler('lot-batch:get', this.handleGetLotBatch.bind(this));

      // Register update handler
      this.registerHandler('lot-batch:update', this.handleUpdateLotBatch.bind(this));

      // Register delete handler
      this.registerHandler('lot-batch:delete', this.handleDeleteLotBatch.bind(this));

      // Register list handler
      this.registerHandler('lot-batch:list', this.handleListLotBatches.bind(this));

      // Register search handler
      this.registerHandler('lot-batch:search', this.handleSearchLotBatches.bind(this));
      // this.registerHandler('lot-batch:update', this.handleUpdateLotBatch.bind(this));
      // this.registerHandler('lot-batch:delete', this.handleDeleteLotBatch.bind(this));
      // this.registerHandler('lot-batch:list', this.handleListLotBatches.bind(this));
      // this.registerHandler('lot-batch:search', this.handleSearchLotBatches.bind(this));
    } catch (error) {
      this.unregisterHandlers();
      throw new LotBatchIpcError('Failed to register lot/batch IPC handlers', 'REGISTRATION_ERROR', error as Error);
    }
  }

  /**
   * Unregister all IPC handlers
   */
  public unregisterHandlers(): void {
    this.registeredChannels.forEach((channel) => {
      ipcMain.removeHandler(channel);
    });
    this.registeredChannels.clear();
  }

  /**
   * Get handler statistics
   */
  public getStats(): { registeredChannels: number; allowedChannels: number } {
    return {
      registeredChannels: this.registeredChannels.size,
      allowedChannels: this.allowedChannels.length,
    };
  }

  /**
   * Handle create lot/batch IPC request
   */
  private async handleCreateLotBatch(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<CreateLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'create-lot-batch';

    try {
      // Validate request
      const validatedRequest = CreateLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.createLotBatchHandler.handle({
        lotNumber: validatedRequest.lotNumber,
        batchNumber: validatedRequest.batchNumber,
        manufacturingDate: validatedRequest.manufacturingDate,
        expiryDate: validatedRequest.expiryDate,
        quantity: validatedRequest.quantity,
        productId: validatedRequest.productId,
        agencyId: validatedRequest.agencyId,
        supplierId: validatedRequest.supplierId,
        supplierLotCode: validatedRequest.supplierLotCode,
        notes: validatedRequest.notes,
        requestedBy: validatedRequest.requestedBy,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          validationErrors: result.validationErrors,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          lotBatchId: result.lotBatchId!,
          lotNumber: result.lotNumber!,
          batchNumber: result.batchNumber || null,
          message: 'Lot/batch created successfully',
        },
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle get lot/batch IPC request
   */
  private async handleGetLotBatch(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<GetLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'get-lot-batch';

    try {
      // Validate request
      const validatedRequest = GetLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.getLotBatchHandler.handle({
        lotBatchId: validatedRequest.lotBatchId,
        requestedBy: validatedRequest.requestedBy,
        includeHistory: validatedRequest.includeHistory,
        includeRelated: validatedRequest.includeRelated,
        nearExpiryDays: validatedRequest.nearExpiryDays,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      const responseData: GetLotBatchResponse = {
        lotBatch: result.lotBatch,
        metadata: result.metadata,
        ...(result.quantityHistory && { quantityHistory: result.quantityHistory }),
        ...(result.relatedLots && { relatedLots: result.relatedLots }),
      };

      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle update lot/batch IPC request
   */
  private async handleUpdateLotBatch(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<UpdateLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'update-lot-batch';

    try {
      // Validate request
      const validatedRequest = UpdateLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.updateLotBatchHandler.handle({
        lotBatchId: validatedRequest.lotBatchId,
        expiryDate: validatedRequest.expiryDate,
        status: validatedRequest.status,
        supplierId: validatedRequest.supplierId,
        supplierLotCode: validatedRequest.supplierLotCode,
        notes: validatedRequest.notes,
        reason: validatedRequest.reason,
        requestedBy: validatedRequest.requestedBy,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          validationErrors: result.validationErrors,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          lotBatchId: result.lotBatchId!,
          updatedFields: result.updatedFields || [],
          message: 'Lot/batch updated successfully',
        },
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle delete lot/batch IPC request
   */
  private async handleDeleteLotBatch(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<DeleteLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'delete-lot-batch';

    try {
      // Validate request
      const validatedRequest = DeleteLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.deleteLotBatchHandler.handle({
        lotBatchId: validatedRequest.lotBatchId,
        deleteType: validatedRequest.deleteType,
        reason: validatedRequest.reason,
        force: validatedRequest.force,
        requestedBy: validatedRequest.requestedBy,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          validationErrors: result.validationErrors,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      const responseData: DeleteLotBatchResponse = {
        lotBatchId: result.lotBatchId!,
        deleteType: result.deleteType!,
        message: 'Lot/batch deleted successfully',
        ...(result.warning && { warning: result.warning }),
      };

      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle list lot/batch IPC request
   */
  private async handleListLotBatches(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<ListLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'list-lot-batches';

    try {
      // Validate request
      const validatedRequest = ListLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.listLotBatchesHandler.handle({
        requestedBy: validatedRequest.requestedBy,
        productId: validatedRequest.productId,
        agencyId: validatedRequest.agencyId,
        status: validatedRequest.status,
        includeExpired: validatedRequest.includeExpired,
        includeInactive: validatedRequest.includeInactive,
        hasQuantityOnly: validatedRequest.hasQuantityOnly,
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder,
        fifoOrder: validatedRequest.fifoOrder,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          lotBatches: result.lotBatches,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
          filters: result.filters,
          sorting: result.sorting,
        },
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle search lot/batch IPC request
   */
  private async handleSearchLotBatches(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<LotBatchIpcResponse<SearchLotBatchResponse>> {
    const startTime = Date.now();
    const operation: LotBatchOperation = 'search-lot-batches';

    try {
      // Validate request
      const validatedRequest = SearchLotBatchRequestSchema.parse(request);

      // Execute handler
      const result = await this.searchLotBatchesHandler.handle({
        requestedBy: validatedRequest.requestedBy,
        productId: validatedRequest.productId,
        agencyId: validatedRequest.agencyId,
        supplierId: validatedRequest.supplierId,
        searchTerm: validatedRequest.searchTerm,
        lotNumber: validatedRequest.lotNumber,
        batchNumber: validatedRequest.batchNumber,
        supplierLotCode: validatedRequest.supplierLotCode,
        status: validatedRequest.status,
        isActive: validatedRequest.isActive,
        isExpired: validatedRequest.isExpired,
        isAvailable: validatedRequest.isAvailable,
        hasQuantity: validatedRequest.hasQuantity,
        minQuantity: validatedRequest.minQuantity,
        maxQuantity: validatedRequest.maxQuantity,
        hasReservedQuantity: validatedRequest.hasReservedQuantity,
        manufacturingDateAfter: validatedRequest.manufacturingDateAfter,
        manufacturingDateBefore: validatedRequest.manufacturingDateBefore,
        expiryDateAfter: validatedRequest.expiryDateAfter,
        expiryDateBefore: validatedRequest.expiryDateBefore,
        createdAfter: validatedRequest.createdAfter,
        createdBefore: validatedRequest.createdBefore,
        updatedAfter: validatedRequest.updatedAfter,
        updatedBefore: validatedRequest.updatedBefore,
        expiringWithinDays: validatedRequest.expiringWithinDays,
        nearExpiryDays: validatedRequest.nearExpiryDays,
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder,
        fifoOrder: validatedRequest.fifoOrder,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          timestamp: Date.now(),
          operation,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          lotBatches: result.lotBatches,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
          searchCriteria: result.searchCriteria,
        },
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Register a single IPC handler
   */
  private registerHandler(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>): void {
    if (!this.allowedChannels.includes(channel)) {
      throw new LotBatchIpcError(`Channel '${channel}' is not allowed`, 'INVALID_CHANNEL');
    }

    if (this.registeredChannels.has(channel)) {
      throw new LotBatchIpcError(`Channel '${channel}' is already registered`, 'DUPLICATE_CHANNEL');
    }

    ipcMain.handle(channel, handler);
    this.registeredChannels.add(channel);
  }

  /**
   * Validate repositories
   */
  private validateRepositories(lotBatchRepository: ILotBatchRepository, userRepository: IUserRepository): void {
    if (!lotBatchRepository) {
      throw new LotBatchIpcError('Lot/batch repository is required', 'MISSING_REPOSITORY');
    }

    if (!userRepository) {
      throw new LotBatchIpcError('User repository is required', 'MISSING_REPOSITORY');
    }
  }

  /**
   * Get safe error response for IPC
   */
  private getSafeErrorResponse(error: Error, operation: LotBatchOperation, startTime: number): LotBatchIpcResponse {
    // Log full error for debugging
    console.error(`Lot/Batch IPC Error [${operation}]:`, error);

    let errorMessage = 'An unexpected error occurred';
    let validationErrors: Record<string, string[]> | undefined;

    if (error instanceof z.ZodError) {
      errorMessage = 'Invalid request data';
      validationErrors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors![path]) {
          validationErrors![path] = [];
        }
        validationErrors![path].push(err.message);
      });
    } else if (error.message) {
      // Use error message but sanitize it
      errorMessage = this.getSafeErrorMessage(error.message);
    }

    return {
      success: false,
      error: errorMessage,
      validationErrors,
      timestamp: Date.now(),
      operation,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Sanitize error message for safe client display
   */
  private getSafeErrorMessage(message: string): string {
    // Remove potentially sensitive information
    const sanitized = message
      .replace(/\/[^\s]*\.[a-zA-Z0-9]+/g, '[PATH]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IP addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
      .trim();

    return sanitized || 'An error occurred during processing';
  }
}

/**
 * Factory function to create LotBatchIpcHandler
 */
export function createLotBatchIpcHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository,
  productRepository: IProductRepository,
  agencyRepository: IAgencyRepository
): LotBatchIpcHandler {
  return LotBatchIpcHandler.create(lotBatchRepository, userRepository, productRepository, agencyRepository);
}
