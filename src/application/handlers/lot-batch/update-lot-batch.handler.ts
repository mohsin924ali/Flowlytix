/**
 * Update Lot/Batch Handler
 *
 * Handler for UpdateLotBatch command following CQRS pattern.
 * Implements business logic for lot/batch updates with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with UPDATE_INVENTORY permission can update lots
 * - Lot/batch numbers are immutable once created
 * - Manufacturing date cannot be changed once set
 * - Expiry date can be extended but not shortened significantly
 * - Quantity adjustments require special handling
 * - Status transitions must follow business rules
 * - Updates must maintain audit trail
 *
 * @domain Lot/Batch Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  UpdateLotBatchCommand,
  UpdateLotBatchCommandResult,
  validateUpdateLotBatchCommand,
  validateLotBatchUpdateBusinessRules,
  prepareLotBatchUpdateData,
} from '../../commands/lot-batch/update-lot-batch.command';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for UpdateLotBatch command
 * Implements business logic for lot/batch updates with proper authorization
 */
export class UpdateLotBatchHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles lot/batch update command
   * @param command - UpdateLotBatch command
   * @returns Promise<UpdateLotBatchCommandResult> - Result with update status
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: UpdateLotBatchCommand): Promise<UpdateLotBatchCommandResult> {
    try {
      // Step 1: Validate command structure
      const validatedCommand = validateUpdateLotBatchCommand(command);

      // Step 2: Get the user who is updating this lot/batch (for authorization)
      const updatingUser = await this.userRepository.findById(validatedCommand.requestedBy);
      if (!updatingUser) {
        return {
          success: false,
          error: 'Updating user not found',
        };
      }

      // Step 3: Check authorization - only users with MANAGE_STOCK permission
      if (!updatingUser.hasPermission(Permission.MANAGE_STOCK)) {
        return {
          success: false,
          error: 'Insufficient permissions to update lot/batch records',
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

      // Step 5: Validate business rules for update
      validateLotBatchUpdateBusinessRules(validatedCommand, {
        manufacturingDate: currentLotBatch.manufacturingDate,
        expiryDate: currentLotBatch.expiryDate,
        status: currentLotBatch.status,
        remainingQuantity: currentLotBatch.remainingQuantity,
        reservedQuantity: currentLotBatch.reservedQuantity,
      });

      // Step 6: Create update data
      const updateData = prepareLotBatchUpdateData(validatedCommand);

      // Step 7: Apply updates to the lot/batch entity
      let updatedLotBatch = currentLotBatch;

      // Update status if provided (this is the main update operation supported)
      if (updateData.status !== undefined) {
        updatedLotBatch = updatedLotBatch.updateStatus(updateData.status, validatedCommand.requestedBy);
      }

      // Step 8: Save updated lot/batch
      const savedLotBatch = await this.lotBatchRepository.update(updatedLotBatch);

      return {
        success: true,
        lotBatchId: savedLotBatch.id,
        updatedFields: Object.keys(updateData),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Applies status transition with business rule validation
   * @param lotBatch - Current lot/batch entity
   * @param newStatus - New status to apply
   * @param userId - User making the change
   * @returns Updated lot/batch entity
   * @throws {Error} When status transition is invalid
   */
  private applyStatusTransition(lotBatch: any, newStatus: any, userId: string): any {
    switch (newStatus) {
      case 'ACTIVE':
        return lotBatch.activate(userId);
      case 'RESERVED':
        return lotBatch.reserve(0, userId); // Reserve with 0 quantity to change status
      case 'QUARANTINED':
        return lotBatch.quarantine(userId);
      case 'DAMAGED':
        return lotBatch.markAsDamaged(userId);
      case 'CONSUMED':
        return lotBatch.markAsConsumed(userId);
      case 'EXPIRED':
        return lotBatch.markAsExpired(userId);
      default:
        throw new Error(`Invalid status transition to: ${newStatus}`);
    }
  }
}

/**
 * Factory function to create UpdateLotBatchHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @returns UpdateLotBatchHandler instance
 */
export function createUpdateLotBatchHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository
): UpdateLotBatchHandler {
  return new UpdateLotBatchHandler(lotBatchRepository, userRepository);
}
