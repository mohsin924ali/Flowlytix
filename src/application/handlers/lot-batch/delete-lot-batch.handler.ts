/**
 * Delete Lot/Batch Handler
 *
 * Handler for DeleteLotBatch command following CQRS pattern.
 * Implements business logic for lot/batch deletion with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with MANAGE_STOCK permission can delete lots
 * - Only empty lots (remaining quantity = 0) can be deleted
 * - Lots with reserved quantity cannot be deleted
 * - Lots referenced in orders/transactions cannot be deleted
 * - Soft delete is preferred over hard delete for audit trail
 * - Deletion reason must be provided
 *
 * @domain Lot/Batch Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  DeleteLotBatchCommand,
  DeleteLotBatchCommandResult,
  validateDeleteLotBatchCommand,
  validateLotBatchDeletionBusinessRules,
  determineDeletionStrategy,
  prepareLotBatchDeletionData,
  DeleteType,
} from '../../commands/lot-batch/delete-lot-batch.command';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Handler for DeleteLotBatch command
 * Implements business logic for lot/batch deletion with proper authorization
 */
export class DeleteLotBatchHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles lot/batch deletion command
   * @param command - DeleteLotBatch command
   * @returns Promise<DeleteLotBatchCommandResult> - Result with deletion status
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: DeleteLotBatchCommand): Promise<DeleteLotBatchCommandResult> {
    try {
      // Step 1: Validate command structure
      const validatedCommand = validateDeleteLotBatchCommand(command);

      // Step 2: Get the user who is deleting this lot/batch (for authorization)
      const deletingUser = await this.userRepository.findById(validatedCommand.requestedBy);
      if (!deletingUser) {
        return {
          success: false,
          error: 'Deleting user not found',
        };
      }

      // Step 3: Check authorization - only users with MANAGE_STOCK permission
      if (!deletingUser.hasPermission(Permission.MANAGE_STOCK)) {
        return {
          success: false,
          error: 'Insufficient permissions to delete lot/batch records',
        };
      }

      // Step 4: Get current lot/batch state
      const currentLotBatch = await this.lotBatchRepository.findById(validatedCommand.lotBatchId);
      if (!currentLotBatch) {
        return {
          success: false,
          error: 'Lot/batch not found',
        };
      }

      // Step 5: Validate business rules for deletion
      validateLotBatchDeletionBusinessRules(validatedCommand, {
        lotNumber: currentLotBatch.lotNumber,
        batchNumber: currentLotBatch.batchNumber,
        status: currentLotBatch.status,
        quantity: currentLotBatch.quantity,
        remainingQuantity: currentLotBatch.remainingQuantity,
        reservedQuantity: currentLotBatch.reservedQuantity,
        productId: currentLotBatch.productId,
        agencyId: currentLotBatch.agencyId,
      });

      // Step 6: Determine deletion strategy
      const strategy = determineDeletionStrategy(validatedCommand, {
        status: currentLotBatch.status,
        remainingQuantity: currentLotBatch.remainingQuantity,
        reservedQuantity: currentLotBatch.reservedQuantity,
      });

      // Step 7: Execute deletion based on strategy
      let result: DeleteLotBatchCommandResult;

      switch (strategy.strategy) {
        case 'hard_delete':
          result = await this.performHardDelete(currentLotBatch, validatedCommand);
          break;
        case 'mark_consumed':
          result = await this.markAsConsumed(currentLotBatch, validatedCommand);
          break;
        case 'soft_delete':
        default:
          result = await this.performSoftDelete(currentLotBatch, validatedCommand);
          break;
      }

      return {
        ...result,
        warning: strategy.reason,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Performs hard deletion (permanent removal)
   * @param lotBatch - Lot/batch to delete
   * @param command - Delete command
   * @returns Deletion result
   */
  private async performHardDelete(lotBatch: any, command: DeleteLotBatchCommand): Promise<DeleteLotBatchCommandResult> {
    const success = await this.lotBatchRepository.delete(lotBatch.id);

    if (success) {
      return {
        success: true,
        lotBatchId: lotBatch.id,
        deleteType: DeleteType.HARD,
      };
    } else {
      return {
        success: false,
        deleteType: DeleteType.HARD,
        error: 'Failed to delete lot/batch',
      };
    }
  }

  /**
   * Marks lot/batch as consumed (soft delete)
   * @param lotBatch - Lot/batch to mark as consumed
   * @param command - Delete command
   * @returns Deletion result
   */
  private async markAsConsumed(lotBatch: any, command: DeleteLotBatchCommand): Promise<DeleteLotBatchCommandResult> {
    // Update status to consumed
    const updatedLotBatch = lotBatch.updateStatus(LotStatus.CONSUMED, command.requestedBy);
    const savedLotBatch = await this.lotBatchRepository.update(updatedLotBatch);

    return {
      success: true,
      lotBatchId: savedLotBatch.id,
      deleteType: DeleteType.SOFT,
    };
  }

  /**
   * Performs soft deletion (marks as inactive)
   * @param lotBatch - Lot/batch to soft delete
   * @param command - Delete command
   * @returns Deletion result
   */
  private async performSoftDelete(lotBatch: any, command: DeleteLotBatchCommand): Promise<DeleteLotBatchCommandResult> {
    // For soft delete, we mark as consumed
    return this.markAsConsumed(lotBatch, command);
  }
}

/**
 * Factory function to create DeleteLotBatchHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @returns DeleteLotBatchHandler instance
 */
export function createDeleteLotBatchHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository
): DeleteLotBatchHandler {
  return new DeleteLotBatchHandler(lotBatchRepository, userRepository);
}
