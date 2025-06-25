/**
 * Agency Queries Index
 *
 * Central export point for all agency-related queries.
 * Provides clean imports for agency query functionality.
 *
 * @domain Agency Management
 * @pattern Query Exports
 * @architecture Multi-tenant
 * @version 1.0.0
 */

// Queries
export type { GetAgenciesQuery, GetAgenciesQueryResult, AgencySummary } from './get-agencies.query';

export {
  GetAgenciesQueryValidationError,
  GetAgenciesQuerySchema,
  validateGetAgenciesQuery,
  validateAgenciesQueryBusinessRules,
} from './get-agencies.query';

export type { GetAgencyByIdQuery, GetAgencyByIdQueryResult, AgencyDetails } from './get-agency-by-id.query';

export {
  GetAgencyByIdQueryValidationError,
  GetAgencyByIdQuerySchema,
  validateGetAgencyByIdQuery,
  validateAgencyIdQueryBusinessRules,
} from './get-agency-by-id.query';

// Note: Additional queries will be exported here as they are implemented
