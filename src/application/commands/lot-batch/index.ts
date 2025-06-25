/**
 * Lot/Batch Commands Index
 *
 * Central export point for all lot/batch-related commands.
 * Provides clean imports for handlers and application services.
 *
 * @domain Lot/Batch Management
 * @pattern CQRS Commands
 * @version 1.0.0
 */

// Create Lot/Batch Command
export type { CreateLotBatchCommand, CreateLotBatchCommandResult } from './create-lot-batch.command';
export {
  CreateLotBatchCommandSchema,
  CreateLotBatchCommandValidationError,
  validateCreateLotBatchCommand,
  validateLotBatchBusinessRules,
  createLotBatchDomainObjects,
} from './create-lot-batch.command';

// Update Lot/Batch Command
export type { UpdateLotBatchCommand, UpdateLotBatchCommandResult } from './update-lot-batch.command';
export {
  UpdateLotBatchCommandSchema,
  UpdateLotBatchCommandValidationError,
  validateUpdateLotBatchCommand,
  validateLotBatchUpdateBusinessRules,
  prepareLotBatchUpdateData,
} from './update-lot-batch.command';

// Delete Lot/Batch Command
export type { DeleteLotBatchCommand, DeleteLotBatchCommandResult } from './delete-lot-batch.command';
export {
  DeleteType,
  DeleteLotBatchCommandSchema,
  DeleteLotBatchCommandValidationError,
  validateDeleteLotBatchCommand,
  validateLotBatchDeletionBusinessRules,
  determineDeletionStrategy,
  prepareLotBatchDeletionData,
} from './delete-lot-batch.command';
