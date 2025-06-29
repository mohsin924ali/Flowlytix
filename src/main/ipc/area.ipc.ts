/**
 * Area IPC Handler
 *
 * Secure IPC bridge for area operations in Electron main process.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Area Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { IAreaRepository } from '../../domain/repositories/area.repository';
import { IAgencyRepository } from '../../domain/repositories/agency.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { CreateAreaHandler } from '../../application/handlers/area/create-area.handler';
import { UpdateAreaHandler } from '../../application/handlers/area/update-area.handler';
import { DeleteAreaHandler } from '../../application/handlers/area/delete-area.handler';
import { GetAreasHandler, GetAreasRequest } from '../../application/handlers/area/get-areas.handler';
import { GetAreaByIdHandler, GetAreaByIdRequest } from '../../application/handlers/area/get-area-by-id.handler';
import { CreateAreaCommand } from '../../application/commands/area/create-area.command';
import { UpdateAreaCommand } from '../../application/commands/area/update-area.command';
import { DeleteAreaCommand } from '../../application/commands/area/delete-area.command';
import { AreaStatus } from '../../domain/entities/area';

/**
 * Area operation types for IPC
 */
export type AreaOperation = 'create-area' | 'update-area' | 'delete-area' | 'get-areas' | 'get-area-by-id';

/**
 * Base response interface for all area IPC operations
 */
export interface AreaIpcResponse<T = any> {
  readonly success: boolean;
  readonly data?: T | undefined;
  readonly error?: string | undefined;
  readonly validationErrors?: string[] | undefined;
  readonly timestamp: number;
  readonly operation: AreaOperation;
}

/**
 * Area request schemas for validation
 */
const CreateAreaRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  areaCode: z.string().min(2).max(20),
  areaName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  boundaries: z.string().optional(), // JSON string
  createdBy: z.string().uuid('Invalid user ID format'),
});

const UpdateAreaRequestSchema = z.object({
  id: z.string().uuid('Invalid area ID format'),
  areaName: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  boundaries: z.string().nullable().optional(), // JSON string
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  updatedBy: z.string().uuid('Invalid user ID format'),
});

const DeleteAreaRequestSchema = z.object({
  id: z.string().uuid('Invalid area ID format'),
  reason: z.string().max(200).optional(),
  deletedBy: z.string().uuid('Invalid user ID format'),
});

const GetAreasRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
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

const GetAreaByIdRequestSchema = z.object({
  id: z.string().uuid('Invalid area ID format'),
  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Area response interfaces
 */
export interface AreaResponse {
  id: string;
  agencyId: string;
  areaCode: string;
  areaName: string;
  description?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  boundaries?: any | undefined; // GeoJSON Polygon
  status: AreaStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AreasListResponse {
  areas: AreaResponse[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateAreaResponse {
  areaId: string;
  areaCode: string;
  areaName: string;
  agencyId: string;
}

export interface UpdateAreaResponse {
  areaId: string;
  areaName: string;
  agencyId: string;
}

/**
 * Area IPC Handler Class
 */
export class AreaIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createAreaHandler: CreateAreaHandler;
  private readonly updateAreaHandler: UpdateAreaHandler;
  private readonly deleteAreaHandler: DeleteAreaHandler;
  private readonly getAreasHandler: GetAreasHandler;
  private readonly getAreaByIdHandler: GetAreaByIdHandler;

  private readonly allowedChannels: readonly string[] = [
    'area:create',
    'area:update',
    'area:delete',
    'area:get-all',
    'area:get-by-id',
  ];

  private constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {
    // Initialize handlers
    this.createAreaHandler = new CreateAreaHandler(areaRepository, userRepository, agencyRepository);
    this.updateAreaHandler = new UpdateAreaHandler(areaRepository, userRepository);
    this.deleteAreaHandler = new DeleteAreaHandler(areaRepository, userRepository);
    this.getAreasHandler = new GetAreasHandler(areaRepository, userRepository);
    this.getAreaByIdHandler = new GetAreaByIdHandler(areaRepository, userRepository);
  }

  public static create(
    areaRepository: IAreaRepository,
    userRepository: IUserRepository,
    agencyRepository: IAgencyRepository
  ): AreaIpcHandler {
    return new AreaIpcHandler(areaRepository, userRepository, agencyRepository);
  }

  public registerHandlers(): void {
    // Create Area
    this.registerHandler('area:create', this.handleCreateArea.bind(this) as any);

    // Update Area
    this.registerHandler('area:update', this.handleUpdateArea.bind(this) as any);

    // Delete Area
    this.registerHandler('area:delete', this.handleDeleteArea.bind(this) as any);

    // Get Areas
    this.registerHandler('area:get-all', this.handleGetAreas.bind(this) as any);

    // Get Area by ID
    this.registerHandler('area:get-by-id', this.handleGetAreaById.bind(this) as any);
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

  private async handleCreateArea(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AreaIpcResponse<CreateAreaResponse>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = CreateAreaRequestSchema.parse(request);

      // Create command
      const command: CreateAreaCommand = {
        agencyId: validatedRequest.agencyId,
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
      const result = await this.createAreaHandler.handle(command);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Unknown error',
          validationErrors: result.validationErrors,
          timestamp: Date.now(),
          operation: 'create-area',
        };
      }

      return {
        success: true,
        data: {
          areaId: result.areaId!,
          areaCode: result.areaCode!,
          areaName: result.areaName!,
          agencyId: result.agencyId!,
        },
        timestamp: Date.now(),
        operation: 'create-area',
      };
    } catch (error) {
      return this.handleError(error, 'create-area', startTime);
    }
  }

  private async handleUpdateArea(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AreaIpcResponse<UpdateAreaResponse>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = UpdateAreaRequestSchema.parse(request);

      // Create command
      const command: UpdateAreaCommand = {
        id: validatedRequest.id,
        updatedBy: validatedRequest.updatedBy,
        ...(validatedRequest.areaName && { areaName: validatedRequest.areaName }),
        ...(validatedRequest.description !== undefined && { description: validatedRequest.description }),
        ...(validatedRequest.latitude !== undefined &&
          validatedRequest.longitude !== undefined && {
            coordinates:
              validatedRequest.latitude === null
                ? null
                : {
                    latitude: validatedRequest.latitude!,
                    longitude: validatedRequest.longitude!,
                  },
          }),
        ...(validatedRequest.boundaries !== undefined && {
          boundaries: validatedRequest.boundaries === null ? null : JSON.parse(validatedRequest.boundaries!),
        }),
        ...(validatedRequest.status && { status: validatedRequest.status as AreaStatus }),
      };

      // Execute command
      const result = await this.updateAreaHandler.handle(command);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Unknown error',
          validationErrors: result.validationErrors,
          timestamp: Date.now(),
          operation: 'update-area',
        };
      }

      return {
        success: true,
        data: {
          areaId: result.areaId!,
          areaName: result.areaName!,
          agencyId: result.agencyId!,
        },
        timestamp: Date.now(),
        operation: 'update-area',
      };
    } catch (error) {
      return this.handleError(error, 'update-area', startTime);
    }
  }

  private async handleDeleteArea(event: IpcMainInvokeEvent, request: unknown): Promise<AreaIpcResponse<boolean>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = DeleteAreaRequestSchema.parse(request);

      // Create command
      const command: DeleteAreaCommand = {
        id: validatedRequest.id,
        deletedBy: validatedRequest.deletedBy,
        ...(validatedRequest.reason && { reason: validatedRequest.reason }),
      };

      // Execute command
      const result = await this.deleteAreaHandler.handle(command);

      return {
        success: result.success,
        data: result.success,
        error: result.success ? undefined : result.error || 'Unknown error',
        timestamp: Date.now(),
        operation: 'delete-area',
      };
    } catch (error) {
      return this.handleError(error, 'delete-area', startTime);
    }
  }

  private async handleGetAreas(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AreaIpcResponse<AreasListResponse>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = GetAreasRequestSchema.parse(request);

      // Create query
      const query: GetAreasRequest = {
        agencyId: validatedRequest.agencyId,
        requestedBy: validatedRequest.requestedBy,
        ...(validatedRequest.status && { status: validatedRequest.status as AreaStatus }),
        ...(validatedRequest.searchText && { searchText: validatedRequest.searchText }),
        ...(validatedRequest.hasCoordinates !== undefined && { hasCoordinates: validatedRequest.hasCoordinates }),
        ...(validatedRequest.hasBoundaries !== undefined && { hasBoundaries: validatedRequest.hasBoundaries }),
        includeInactive: validatedRequest.includeInactive,
        sort: {
          field: validatedRequest.sortBy as any,
          direction: validatedRequest.sortDirection,
        },
        pagination: {
          page: validatedRequest.page,
          limit: validatedRequest.limit,
        },
      };

      // Execute query
      const result = await this.getAreasHandler.handle(query);

      if (!result.success || !result.areas) {
        return {
          success: false,
          error: result.error || 'Unknown error',
          timestamp: Date.now(),
          operation: 'get-areas',
        };
      }

      // Convert areas to response format
      const areas: AreaResponse[] = result.areas.areas.map((area) => ({
        id: area.id,
        agencyId: area.agencyId,
        areaCode: area.areaCode,
        areaName: area.areaName,
        description: area.description || undefined,
        latitude: area.coordinates?.latitude,
        longitude: area.coordinates?.longitude,
        boundaries: area.boundaries,
        status: area.status,
        createdAt: area.createdAt.toISOString(),
        updatedAt: area.updatedAt.toISOString(),
        createdBy: area.createdBy,
      }));

      return {
        success: true,
        data: {
          areas,
          totalCount: result.areas.totalCount,
          totalPages: result.areas.totalPages,
          currentPage: result.areas.currentPage,
          hasNextPage: result.areas.hasNextPage,
          hasPreviousPage: result.areas.hasPreviousPage,
        },
        timestamp: Date.now(),
        operation: 'get-areas',
      };
    } catch (error) {
      return this.handleError(error, 'get-areas', startTime);
    }
  }

  private async handleGetAreaById(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AreaIpcResponse<AreaResponse | null>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = GetAreaByIdRequestSchema.parse(request);

      // Create query
      const query: GetAreaByIdRequest = {
        id: validatedRequest.id,
        requestedBy: validatedRequest.requestedBy,
      };

      // Execute query
      const result = await this.getAreaByIdHandler.handle(query);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Unknown error',
          timestamp: Date.now(),
          operation: 'get-area-by-id',
        };
      }

      if (!result.area) {
        return {
          success: true,
          data: null,
          timestamp: Date.now(),
          operation: 'get-area-by-id',
        };
      }

      // Convert area to response format
      const areaResponse: AreaResponse = {
        id: result.area.id,
        agencyId: result.area.agencyId,
        areaCode: result.area.areaCode,
        areaName: result.area.areaName,
        description: result.area.description || undefined,
        latitude: result.area.coordinates?.latitude,
        longitude: result.area.coordinates?.longitude,
        boundaries: result.area.boundaries,
        status: result.area.status,
        createdAt: result.area.createdAt.toISOString(),
        updatedAt: result.area.updatedAt.toISOString(),
        createdBy: result.area.createdBy,
      };

      return {
        success: true,
        data: areaResponse,
        timestamp: Date.now(),
        operation: 'get-area-by-id',
      };
    } catch (error) {
      return this.handleError(error, 'get-area-by-id', startTime);
    }
  }

  private handleError(error: unknown, operation: AreaOperation, startTime: number): AreaIpcResponse {
    const executionTime = Date.now() - startTime;

    console.error(`Area IPC ${operation} error (${executionTime}ms):`, error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: Date.now(),
        operation,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now(),
      operation,
    };
  }
}

/**
 * Create Area IPC Handler
 */
export function createAreaIpcHandler(
  areaRepository: IAreaRepository,
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): AreaIpcHandler {
  return AreaIpcHandler.create(areaRepository, userRepository, agencyRepository);
}

/**
 * Register Area IPC Handlers (for backward compatibility)
 */
export function registerAreaIpcHandlers(
  areaRepository: IAreaRepository,
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): void {
  const handler = createAreaIpcHandler(areaRepository, userRepository, agencyRepository);
  handler.registerHandlers();
}

/**
 * Unregister Area IPC Handlers (for backward compatibility)
 */
export function unregisterAreaIpcHandlers(): void {
  // Remove all area-related IPC handlers
  const channels = ['area:create', 'area:update', 'area:delete', 'area:get-all', 'area:get-by-id'];
  for (const channel of channels) {
    ipcMain.removeAllListeners(channel);
  }
}
