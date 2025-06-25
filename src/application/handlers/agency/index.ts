/**
 * Agency Handlers Index
 *
 * Central export point for all agency-related command and query handlers.
 * Following CQRS pattern for clear separation of concerns.
 */

// Command Handlers
export { CreateAgencyHandler, createAgencyHandler } from './create-agency.handler';
export { UpdateAgencyHandler, createUpdateAgencyHandler } from './update-agency.handler';
export type { CreateAgencyResult } from './create-agency.handler';

// Query Handlers
export { GetAgenciesHandler, createGetAgenciesHandler } from './get-agencies.handler';
export { GetAgencyByIdHandler, createGetAgencyByIdHandler } from './get-agency-by-id.handler';

// Query Handlers - to be added in future phases
// export { GetAgenciesHandler } from './get-agencies.handler';
// export { GetAgencyByIdHandler } from './get-agency-by-id.handler';

// Result Types
export type { GetAgenciesQueryResult } from '../../queries/agency/get-agencies.query';
export type { GetAgencyByIdQueryResult, AgencyDetails } from '../../queries/agency/get-agency-by-id.query';
