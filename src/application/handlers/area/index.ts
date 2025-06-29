/**
 * Area Handlers Index
 *
 * Barrel export for all area-related handlers.
 * Provides clean imports for area handler operations.
 *
 * @domain Area Management
 * @pattern Barrel Export
 * @version 1.0.0
 */

// Command Handlers
export { CreateAreaHandler } from './create-area.handler';
export { UpdateAreaHandler } from './update-area.handler';
export { DeleteAreaHandler } from './delete-area.handler';

// Query Handlers
export { GetAreasHandler } from './get-areas.handler';
export { GetAreaByIdHandler } from './get-area-by-id.handler';

// Request/Result Types
export type { GetAreasRequest, GetAreasResult } from './get-areas.handler';

export type { GetAreaByIdRequest, GetAreaByIdResult } from './get-area-by-id.handler';
