/**
 * Enhanced Area IPC Handler with Connection Pool Support
 *
 * Multi-tenant area IPC handler that uses connection pooling and agency context
 * for proper database isolation between agencies.
 *
 * Features:
 * - Agency context-aware operations
 * - Dynamic connection pooling
 * - Multi-tenant database isolation
 * - Proper error handling
 * - Business rule enforcement
 *
 * @domain Area Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @version 2.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { IAreaRepository } from '../../domain/repositories/area.repository';
import { IAgencyRepository } from '../../domain/repositories/agency.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { SqliteAreaRepository } from '../../infrastructure/repositories/area.repository';
import { CreateAreaHandler } from '../../application/handlers/area/create-area.handler';
import { UpdateAreaHandler } from '../../application/handlers/area/update-area.handler';
import { DeleteAreaHandler } from '../../application/handlers/area/delete-area.handler';
import { GetAreasHandler, GetAreasRequest } from '../../application/handlers/area/get-areas.handler';
import { GetAreaByIdHandler, GetAreaByIdRequest } from '../../application/handlers/area/get-area-by-id.handler';
import { CreateAreaCommand } from '../../application/commands/area/create-area.command';
import { UpdateAreaCommand } from '../../application/commands/area/update-area.command';
import { DeleteAreaCommand } from '../../application/commands/area/delete-area.command';
import { AreaStatus } from '../../domain/entities/area';
import { getConnectionPool } from '../../infrastructure/database/connection-pool';
import { getAgencyContextManager, getCurrentAgencyDatabase } from '../../infrastructure/database/agency-context';

/**
 * Enhanced Area IPC Handler with Multi-Tenant Support
 */
export class EnhancedAreaIpcHandler {
  private readonly registeredChannels = new Set<string>();

  private readonly allowedChannels: readonly string[] = [
    'area:create',
    'area:update',
    'area:delete',
    'area:get-all',
    'area:get-by-id',
  ];

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {}

  public static create(userRepository: IUserRepository, agencyRepository: IAgencyRepository): EnhancedAreaIpcHandler {
    return new EnhancedAreaIpcHandler(userRepository, agencyRepository);
  }

  public registerHandlers(): void {
    // Create Area
    this.registerHandler('area:create', this.handleCreateArea.bind(this));

    // Update Area
    this.registerHandler('area:update', this.handleUpdateArea.bind(this));

    // Delete Area
    this.registerHandler('area:delete', this.handleDeleteArea.bind(this));

    // Get Areas
    this.registerHandler('area:get-all', this.handleGetAreas.bind(this));

    // Get Area by ID
    this.registerHandler('area:get-by-id', this.handleGetAreaById.bind(this));
  }

  public unregisterHandlers(): void {
    for (const channel of this.registeredChannels) {
      ipcMain.removeAllListeners(channel);
    }
    this.registeredChannels.clear();
  }

  private registerHandler(channel: string, handler: any): void {
    if (!this.allowedChannels.includes(channel)) {
      throw new Error(`Channel ${channel} is not allowed`);
    }

    ipcMain.handle(channel, handler);
    this.registeredChannels.add(channel);
  }

  /**
   * Get area repository for current agency context
   */
  private async getAreaRepository(): Promise<IAreaRepository | null> {
    try {
      const contextManager = getAgencyContextManager();
      const currentAgencyId = contextManager.getCurrentAgencyId();

      if (!currentAgencyId) {
        console.warn('⚠️ No agency context set for area operation');
        return null;
      }

      const database = await getCurrentAgencyDatabase();
      if (!database) {
        console.error('❌ Failed to get agency database');
        return null;
      }

      return new SqliteAreaRepository(database);
    } catch (error) {
      console.error('❌ Error getting area repository:', error);
      return null;
    }
  }

  /**
   * Validate agency context before operations
   */
  private async validateAgencyContext(
    userId: string
  ): Promise<{ success: boolean; error?: string; agencyId?: string }> {
    try {
      const contextManager = getAgencyContextManager();
      const currentAgencyId = contextManager.getCurrentAgencyId();

      // Check if agency context is set
      if (!currentAgencyId) {
        return {
          success: false,
          error: 'No agency context set. Please select an agency first.',
        };
      }

      // Validate context is still valid
      const isValid = await contextManager.validateCurrentContext();
      if (!isValid) {
        return {
          success: false,
          error: 'Current agency context is invalid. Please select an agency again.',
        };
      }

      return {
        success: true,
        agencyId: currentAgencyId,
      };
    } catch (error) {
      console.error('❌ Error validating agency context:', error);
      return {
        success: false,
        error: 'Failed to validate agency context',
      };
    }
  }

  /**
   * Handle Create Area
   */
  private async handleCreateArea(event: IpcMainInvokeEvent, request: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🗺️ Enhanced Area Create: Processing request');

      // Input validation
      const CreateAreaRequestSchema = z.object({
        areaCode: z.string().min(2).max(20),
        areaName: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        boundaries: z.string().optional(),
        createdBy: z.string().uuid('Invalid user ID format'),
      });

      const validatedRequest = CreateAreaRequestSchema.parse(request);

      // Validate agency context
      const contextValidation = await this.validateAgencyContext(validatedRequest.createdBy);
      if (!contextValidation.success) {
        return {
          success: false,
          error: contextValidation.error,
          timestamp: Date.now(),
          operation: 'create-area',
        };
      }

      // Get area repository for current agency
      const areaRepository = await this.getAreaRepository();
      if (!areaRepository) {
        return {
          success: false,
          error: 'Failed to initialize area repository for current agency',
          timestamp: Date.now(),
          operation: 'create-area',
        };
      }

      // Create command with agency context
      const command: CreateAreaCommand = {
        agencyId: contextValidation.agencyId!,
        areaCode: validatedRequest.areaCode,
        areaName: validatedRequest.areaName,
        ...(validatedRequest.description && { description: validatedRequest.description }),
        ...(validatedRequest.latitude &&
          validatedRequest.longitude && {
            coordinates: {
              latitude: validatedRequest.latitude,
              longitude: validatedRequest.longitude,
            },
          }),
        ...(validatedRequest.boundaries && { boundaries: JSON.parse(validatedRequest.boundaries) }),
        createdBy: validatedRequest.createdBy,
      };

      // Execute command
      const handler = new CreateAreaHandler(areaRepository, this.userRepository, this.agencyRepository);
      const result = await handler.handle(command);

      const responseTime = Date.now() - startTime;
      console.log(`✅ Enhanced Area Create: Completed in ${responseTime}ms`);

      return {
        success: result.success,
        data: result.success
          ? {
              areaId: result.areaId,
              areaCode: result.areaCode,
              areaName: result.areaName,
              agencyId: result.agencyId,
            }
          : undefined,
        error: result.error,
        validationErrors: result.validationErrors,
        timestamp: Date.now(),
        operation: 'create-area',
      };
    } catch (error) {
      console.error('❌ Enhanced Area Create: Error:', error);
      return this.handleError(error, 'create-area', startTime);
    }
  }

  /**
   * Handle Get Areas
   */
  private async handleGetAreas(event: IpcMainInvokeEvent, request: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🗺️ Enhanced Area Get All: Processing request');

      // Input validation
      const GetAreasRequestSchema = z.object({
        includeInactive: z.boolean().default(false),
        searchText: z.string().max(100).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        hasCoordinates: z.boolean().optional(),
        hasBoundaries: z.boolean().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        sortBy: z.enum(['areaCode', 'areaName', 'status', 'createdAt', 'updatedAt']).default('areaCode'),
        sortDirection: z.enum(['asc', 'desc']).default('asc'),
        requestedBy: z.string().uuid('Invalid user ID format'),
      });

      const validatedRequest = GetAreasRequestSchema.parse(request);

      // Validate agency context
      const contextValidation = await this.validateAgencyContext(validatedRequest.requestedBy);
      if (!contextValidation.success) {
        return {
          success: false,
          error: contextValidation.error,
          timestamp: Date.now(),
          operation: 'get-areas',
        };
      }

      // Get area repository for current agency
      const areaRepository = await this.getAreaRepository();
      if (!areaRepository) {
        return {
          success: false,
          error: 'Failed to initialize area repository for current agency',
          timestamp: Date.now(),
          operation: 'get-areas',
        };
      }

      // Create query with agency context
      const query: GetAreasRequest = {
        agencyId: contextValidation.agencyId!,
        includeInactive: validatedRequest.includeInactive,
        ...(validatedRequest.searchText && { searchText: validatedRequest.searchText }),
        status: validatedRequest.status as AreaStatus,
        hasCoordinates: validatedRequest.hasCoordinates,
        hasBoundaries: validatedRequest.hasBoundaries,
        sort: {
          field: validatedRequest.sortBy,
          direction: validatedRequest.sortDirection,
        },
        pagination: {
          page: validatedRequest.page || 1,
          limit: validatedRequest.limit,
        },
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute query
      const handler = new GetAreasHandler(areaRepository, this.userRepository);
      const result = await handler.handle(query);

      const responseTime = Date.now() - startTime;
      console.log(`✅ Enhanced Area Get All: Completed in ${responseTime}ms`);

      return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.error,
        timestamp: Date.now(),
        operation: 'get-areas',
      };
    } catch (error) {
      console.error('❌ Enhanced Area Get All: Error:', error);
      return this.handleError(error, 'get-areas', startTime);
    }
  }

  /**
   * Handle Update Area
   */
  private async handleUpdateArea(event: IpcMainInvokeEvent, request: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🗺️ Enhanced Area Update: Processing request');

      // Input validation
      const UpdateAreaRequestSchema = z.object({
        id: z.string().uuid('Invalid area ID format'),
        areaName: z.string().min(2).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        boundaries: z.string().nullable().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        updatedBy: z.string().uuid('Invalid user ID format'),
      });

      const validatedRequest = UpdateAreaRequestSchema.parse(request);

      // Validate agency context
      const contextValidation = await this.validateAgencyContext(validatedRequest.updatedBy);
      if (!contextValidation.success) {
        return {
          success: false,
          error: contextValidation.error,
          timestamp: Date.now(),
          operation: 'update-area',
        };
      }

      // Get area repository for current agency
      const areaRepository = await this.getAreaRepository();
      if (!areaRepository) {
        return {
          success: false,
          error: 'Failed to initialize area repository for current agency',
          timestamp: Date.now(),
          operation: 'update-area',
        };
      }

      // Create command
      const command: UpdateAreaCommand = {
        id: validatedRequest.id,
        areaName: validatedRequest.areaName,
        description: validatedRequest.description,
        coordinates:
          validatedRequest.latitude && validatedRequest.longitude
            ? {
                latitude: validatedRequest.latitude,
                longitude: validatedRequest.longitude,
              }
            : undefined,
        boundaries: validatedRequest.boundaries ? JSON.parse(validatedRequest.boundaries) : undefined,
        status: validatedRequest.status as AreaStatus,
        updatedBy: validatedRequest.updatedBy,
      };

      // Execute command
      const handler = new UpdateAreaHandler(areaRepository, this.userRepository);
      const result = await handler.handle(command);

      const responseTime = Date.now() - startTime;
      console.log(`✅ Enhanced Area Update: Completed in ${responseTime}ms`);

      return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.error,
        validationErrors: result.validationErrors,
        timestamp: Date.now(),
        operation: 'update-area',
      };
    } catch (error) {
      console.error('❌ Enhanced Area Update: Error:', error);
      return this.handleError(error, 'update-area', startTime);
    }
  }

  /**
   * Handle Delete Area
   */
  private async handleDeleteArea(event: IpcMainInvokeEvent, request: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🗺️ Enhanced Area Delete: Processing request');

      // Input validation
      const DeleteAreaRequestSchema = z.object({
        id: z.string().uuid('Invalid area ID format'),
        reason: z.string().max(200).optional(),
        deletedBy: z.string().uuid('Invalid user ID format'),
      });

      const validatedRequest = DeleteAreaRequestSchema.parse(request);

      // Validate agency context
      const contextValidation = await this.validateAgencyContext(validatedRequest.deletedBy);
      if (!contextValidation.success) {
        return {
          success: false,
          error: contextValidation.error,
          timestamp: Date.now(),
          operation: 'delete-area',
        };
      }

      // Get area repository for current agency
      const areaRepository = await this.getAreaRepository();
      if (!areaRepository) {
        return {
          success: false,
          error: 'Failed to initialize area repository for current agency',
          timestamp: Date.now(),
          operation: 'delete-area',
        };
      }

      // Create command
      const command: DeleteAreaCommand = {
        id: validatedRequest.id,
        reason: validatedRequest.reason || 'No reason provided',
        deletedBy: validatedRequest.deletedBy,
      };

      // Execute command
      const handler = new DeleteAreaHandler(areaRepository, this.userRepository);
      const result = await handler.handle(command);

      const responseTime = Date.now() - startTime;
      console.log(`✅ Enhanced Area Delete: Completed in ${responseTime}ms`);

      return {
        success: result.success,
        data: result.success ? result.area : undefined,
        error: result.error,
        timestamp: Date.now(),
        operation: 'delete-area',
      };
    } catch (error) {
      console.error('❌ Enhanced Area Delete: Error:', error);
      return this.handleError(error, 'delete-area', startTime);
    }
  }

  /**
   * Handle Get Area by ID
   */
  private async handleGetAreaById(event: IpcMainInvokeEvent, request: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🗺️ Enhanced Area Get By ID: Processing request');

      // Input validation
      const GetAreaByIdRequestSchema = z.object({
        id: z.string().uuid('Invalid area ID format'),
        requestedBy: z.string().uuid('Invalid user ID format'),
      });

      const validatedRequest = GetAreaByIdRequestSchema.parse(request);

      // Validate agency context
      const contextValidation = await this.validateAgencyContext(validatedRequest.requestedBy);
      if (!contextValidation.success) {
        return {
          success: false,
          error: contextValidation.error,
          timestamp: Date.now(),
          operation: 'get-area-by-id',
        };
      }

      // Get area repository for current agency
      const areaRepository = await this.getAreaRepository();
      if (!areaRepository) {
        return {
          success: false,
          error: 'Failed to initialize area repository for current agency',
          timestamp: Date.now(),
          operation: 'get-area-by-id',
        };
      }

      // Create query
      const query: GetAreaByIdRequest = {
        id: validatedRequest.id,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute query
      const handler = new GetAreaByIdHandler(areaRepository, this.userRepository);
      const result = await handler.handle(query);

      const responseTime = Date.now() - startTime;
      console.log(`✅ Enhanced Area Get By ID: Completed in ${responseTime}ms`);

      return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.error,
        timestamp: Date.now(),
        operation: 'get-area-by-id',
      };
    } catch (error) {
      console.error('❌ Enhanced Area Get By ID: Error:', error);
      return this.handleError(error, 'get-area-by-id', startTime);
    }
  }

  /**
   * Handle errors with consistent format
   */
  private handleError(error: unknown, operation: string, startTime: number): any {
    const responseTime = Date.now() - startTime;
    console.error(`❌ Enhanced Area ${operation}: Failed in ${responseTime}ms:`, error);

    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
      operation,
    };
  }
}

/**
 * Register enhanced area IPC handlers
 */
export function registerEnhancedAreaIpcHandlers(
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): void {
  const handler = EnhancedAreaIpcHandler.create(userRepository, agencyRepository);
  handler.registerHandlers();
  console.log('✅ Enhanced Area IPC handlers registered with connection pool support');
}

/**
 * Unregister enhanced area IPC handlers
 */
export function unregisterEnhancedAreaIpcHandlers(): void {
  // Create temporary handler to unregister
  const tempHandler = new EnhancedAreaIpcHandler({} as any, {} as any);
  tempHandler.unregisterHandlers();
  console.log('✅ Enhanced Area IPC handlers unregistered');
}
