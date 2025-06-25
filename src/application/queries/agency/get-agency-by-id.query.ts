/**
 * Get Agency By ID Query
 *
 * Query for retrieving a single agency by its ID in the multi-tenant distribution system.
 * Handles authorization, validation, and business rules enforcement following CQRS pattern.
 *
 * Business Rules:
 * - Only users with VIEW_AGENCY permission can view agencies
 * - Super admins can view any agency
 * - Regular users can only view their own agency
 * - Agency ID must be valid UUID format
 *
 * @domain Agency Management
 * @pattern CQRS Query
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import { z } from 'zod';
import { AgencyStatus } from '../../../domain/entities/agency';

/**
 * Zod schema for get agency by ID query validation
 */
export const GetAgencyByIdQuerySchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),

  requestedBy: z.string().uuid('Invalid user ID format'),

  // Optional flag to include detailed business settings
  includeSettings: z.boolean().default(false),

  // Optional flag to include operational statistics
  includeStats: z.boolean().default(false),
});

/**
 * Get Agency By ID Query Type
 */
export type GetAgencyByIdQuery = z.infer<typeof GetAgencyByIdQuerySchema>;

/**
 * Detailed Agency interface for single agency results
 */
export interface AgencyDetails {
  readonly id: string;
  readonly name: string;
  readonly databasePath: string;
  readonly contactPerson: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly status: AgencyStatus;
  readonly isOperational: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string | null;

  // Business settings (included if includeSettings = true)
  readonly settings?: {
    readonly allowCreditSales: boolean;
    readonly defaultCreditDays: number;
    readonly maxCreditLimit: number;
    readonly requireApprovalForOrders: boolean;
    readonly enableInventoryTracking: boolean;
    readonly taxRate: number;
    readonly currency: string;
    readonly businessHours: {
      readonly start: string;
      readonly end: string;
      readonly timezone: string;
    };
    readonly notifications: {
      readonly lowStock: boolean;
      readonly overduePayments: boolean;
      readonly newOrders: boolean;
    };
  };

  // Operational statistics (included if includeStats = true)
  readonly stats?: {
    readonly totalCustomers: number;
    readonly totalProducts: number;
    readonly totalActiveOrders: number;
    readonly lastActivityDate: Date | null;
    readonly databaseSizeMB: number;
  };
}

/**
 * Get Agency By ID Query Result
 */
export interface GetAgencyByIdQueryResult {
  readonly success: boolean;
  readonly agency: AgencyDetails | null;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Query validation error
 */
export class GetAgencyByIdQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'GetAgencyByIdQueryValidationError';
  }
}

/**
 * Validate get agency by ID query
 * @param query - Query to validate
 * @returns Validated query data
 * @throws {GetAgencyByIdQueryValidationError} When validation fails
 */
export function validateGetAgencyByIdQuery(query: unknown): GetAgencyByIdQuery {
  try {
    return GetAgencyByIdQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      throw new GetAgencyByIdQueryValidationError('Get agency by ID query validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate agency ID query business rules
 * @param query - Get agency by ID query
 * @throws {Error} When business rules are violated
 */
export function validateAgencyIdQueryBusinessRules(query: GetAgencyByIdQuery): void {
  // Validate that agency ID is not the same as requesting user ID (business logic check)
  if (query.agencyId === query.requestedBy) {
    throw new Error('Agency ID cannot be the same as requesting user ID');
  }

  // Warn for potentially expensive operations
  if (query.includeSettings && query.includeStats) {
    console.warn('Including both settings and stats may impact query performance');
  }

  // Validate UUID format more strictly (business rule)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(query.agencyId)) {
    throw new Error('Agency ID must be a valid UUID v4 format');
  }

  if (!uuidRegex.test(query.requestedBy)) {
    throw new Error('Requesting user ID must be a valid UUID v4 format');
  }
}
