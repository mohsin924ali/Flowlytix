/**
 * Get Agencies Query
 *
 * Query for retrieving and searching agencies in the multi-tenant distribution system.
 * Handles comprehensive agency filtering, pagination, and business rules enforcement
 * following CQRS pattern.
 *
 * Business Rules:
 * - Only users with VIEW_AGENCY permission can view agencies
 * - Super admins can view all agencies
 * - Regular users can only view their own agency
 * - Pagination is required for large result sets
 * - Search filters must be valid
 *
 * @domain Agency Management
 * @pattern CQRS Query
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import { z } from 'zod';
import { AgencyStatus } from '../../../domain/entities/agency';

/**
 * Zod schema for get agencies query validation
 */
export const GetAgenciesQuerySchema = z.object({
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit cannot exceed 1000')
    .default(50),

  offset: z.number().int('Offset must be an integer').min(0, 'Offset cannot be negative').default(0),

  sortBy: z.enum(['name', 'contactPerson', 'status', 'createdAt', 'updatedAt']).default('createdAt'),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Filtering options
  status: z
    .nativeEnum(AgencyStatus, {
      errorMap: () => ({ message: 'Invalid agency status' }),
    })
    .optional(),

  search: z.string().max(255, 'Search term too long').optional(),

  contactPerson: z.string().max(100, 'Contact person name too long').optional(),

  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters only')
    .optional(),

  // Date range filtering
  createdAfter: z.string().datetime('Invalid datetime format').optional(),

  createdBefore: z.string().datetime('Invalid datetime format').optional(),

  updatedAfter: z.string().datetime('Invalid datetime format').optional(),

  updatedBefore: z.string().datetime('Invalid datetime format').optional(),

  // Business settings filters
  allowsCreditSales: z.boolean().optional(),

  enablesInventoryTracking: z.boolean().optional(),

  // Authorization context
  requestedBy: z.string().uuid('Invalid user ID format'),

  // Multi-tenant context (for super admins viewing specific agencies)
  agencyId: z.string().uuid('Invalid agency ID format').optional(),
});

/**
 * Get Agencies Query Type
 */
export type GetAgenciesQuery = z.infer<typeof GetAgenciesQuerySchema>;

/**
 * Agency Summary interface for query results
 */
export interface AgencySummary {
  readonly id: string;
  readonly name: string;
  readonly contactPerson: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly status: AgencyStatus;
  readonly isOperational: boolean;
  readonly allowsCreditSales: boolean;
  readonly currency: string;
  readonly databasePath: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Get Agencies Query Result
 */
export interface GetAgenciesQueryResult {
  readonly success: boolean;
  readonly agencies: readonly AgencySummary[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly searchCriteria: Partial<GetAgenciesQuery>;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Query validation error
 */
export class GetAgenciesQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'GetAgenciesQueryValidationError';
  }
}

/**
 * Validate get agencies query
 * @param query - Query to validate
 * @returns Validated query data
 * @throws {GetAgenciesQueryValidationError} When validation fails
 */
export function validateGetAgenciesQuery(query: unknown): GetAgenciesQuery {
  try {
    return GetAgenciesQuerySchema.parse(query);
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

      throw new GetAgenciesQueryValidationError('Agency query validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate agencies business rules for query
 * @param query - Get agencies query
 * @throws {Error} When business rules are violated
 */
export function validateAgenciesQueryBusinessRules(query: GetAgenciesQuery): void {
  // Validate date range coherence
  if (query.createdAfter && query.createdBefore) {
    const afterDate = new Date(query.createdAfter);
    const beforeDate = new Date(query.createdBefore);

    if (afterDate >= beforeDate) {
      throw new Error('createdAfter date must be before createdBefore date');
    }

    // Warn for very large date ranges
    const daysDiff = (beforeDate.getTime() - afterDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      console.warn('Date range exceeds 1 year - query performance may be impacted');
    }
  }

  if (query.updatedAfter && query.updatedBefore) {
    const afterDate = new Date(query.updatedAfter);
    const beforeDate = new Date(query.updatedBefore);

    if (afterDate >= beforeDate) {
      throw new Error('updatedAfter date must be before updatedBefore date');
    }
  }

  // Validate pagination limits for performance
  if (query.limit > 500 && query.offset === 0) {
    console.warn('Large initial page size may impact performance - consider using smaller limit with pagination');
  }

  if (query.offset > 10000) {
    console.warn('Very large offset may impact performance - consider using cursor-based pagination');
  }

  // Validate search term
  if (query.search && query.search.trim().length > 0) {
    const searchTerm = query.search.trim();

    // Warn for very short search terms
    if (searchTerm.length < 2) {
      console.warn('Very short search terms may return too many results');
    }

    // Check for potential performance issues
    if (searchTerm.includes('%') || searchTerm.includes('_')) {
      console.warn('Search term contains SQL wildcard characters - ensure proper escaping');
    }
  }

  // Validate currency filter
  if (query.currency && !['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'].includes(query.currency)) {
    console.warn(`Currency filter ${query.currency} may not be widely supported`);
  }
}
