/**
 * Area Commands Index
 *
 * Barrel export for all area-related commands.
 * Provides clean imports for area command operations.
 *
 * @domain Area Management
 * @pattern Barrel Export
 * @version 1.0.0
 */

// Create Area Command
export type { CreateAreaCommand, CreateAreaCommandResult } from './create-area.command';
export { CreateAreaCommandValidationError, validateCreateAreaCommand } from './create-area.command';

// Update Area Command
export type { UpdateAreaCommand, UpdateAreaCommandResult } from './update-area.command';
export { UpdateAreaCommandValidationError, validateUpdateAreaCommand } from './update-area.command';

// Delete Area Command
export type { DeleteAreaCommand, DeleteAreaCommandResult } from './delete-area.command';
export { DeleteAreaCommandValidationError, validateDeleteAreaCommand } from './delete-area.command';
