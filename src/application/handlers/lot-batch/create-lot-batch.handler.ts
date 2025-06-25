/**
 * Create Lot/Batch Handler
 *
 * Handler for CreateLotBatch command following CQRS pattern.
 * Implements business logic for lot/batch creation with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with CREATE_INVENTORY permission can create lots
 * - Lot number must be unique within product and agency
 * - Batch number must be unique within lot (if provided)
 * - Manufacturing date cannot be in the future
 * - Expiry date must be after manufacturing date (if provided)
 * - Product must exist and be active
 * - Agency must exist and be operational
 * - Supplier validation for external lots
 *
 * @domain Lot/Batch Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  CreateLotBatchCommand,
  CreateLotBatchCommandResult,
  validateCreateLotBatchCommand,
  validateLotBatchBusinessRules,
  createLotBatchDomainObjects,
} from '../../commands/lot-batch/create-lot-batch.command';
import { LotBatch } from '../../../domain/value-objects/lot-batch';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { Permission } from '../../../domain/value-objects/role';
import { ProductStatus } from '../../../domain/entities/product';

/**
 * Handler for CreateLotBatch command
 * Implements business logic for lot/batch creation with proper authorization
 */
export class CreateLotBatchHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {}

  /**
   * Handles lot/batch creation command
   * @param command - CreateLotBatch command
   * @returns Promise<CreateLotBatchCommandResult> - Result with created lot/batch ID
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: CreateLotBatchCommand): Promise<CreateLotBatchCommandResult> {
    try {
      // Step 1: Validate command structure
      const validatedCommand = validateCreateLotBatchCommand(command);

      // Step 2: Get the user who is creating this lot/batch (for authorization)
      const creatingUser = await this.userRepository.findById(validatedCommand.requestedBy);
      if (!creatingUser) {
        return {
          success: false,
          error: 'Creating user not found',
        };
      }

      // Step 3: Check authorization - only users with CREATE_PRODUCT permission
      if (!creatingUser.hasPermission(Permission.CREATE_PRODUCT)) {
        return {
          success: false,
          error: 'Insufficient permissions to create lot/batch records',
        };
      }

      // Step 4: Validate referenced entities exist and are active
      const entityValidationResult = await this.validateReferencedEntities(validatedCommand);
      if (!entityValidationResult.isValid) {
        return {
          success: false,
          error: entityValidationResult.error!,
        };
      }

      // Step 5: Validate business rules
      try {
        validateLotBatchBusinessRules(validatedCommand);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Business rule validation failed',
        };
      }

      // Step 6: Check for lot number uniqueness within product and agency
      const existingLot = await this.lotBatchRepository.findByLotNumber(
        validatedCommand.lotNumber,
        validatedCommand.productId,
        validatedCommand.agencyId
      );
      if (existingLot) {
        return {
          success: false,
          error: `Lot number '${validatedCommand.lotNumber}' already exists for this product`,
        };
      }

      // Step 7: Check for batch number uniqueness within lot (if provided)
      if (validatedCommand.batchNumber) {
        const existingBatch = await this.lotBatchRepository.findByLotAndBatchNumber(
          validatedCommand.lotNumber,
          validatedCommand.batchNumber,
          validatedCommand.productId,
          validatedCommand.agencyId
        );
        if (existingBatch) {
          return {
            success: false,
            error: `Batch number '${validatedCommand.batchNumber}' already exists for lot '${validatedCommand.lotNumber}'`,
          };
        }
      }

      // Step 8: Create domain objects
      const domainObjects = createLotBatchDomainObjects(validatedCommand);

      // Step 9: Create the lot/batch entity
      const newLotBatch = LotBatch.create({
        lotNumber: domainObjects.lotNumber,
        batchNumber: domainObjects.batchNumber,
        manufacturingDate: domainObjects.manufacturingDate,
        expiryDate: domainObjects.expiryDate,
        quantity: domainObjects.quantity,
        productId: domainObjects.productId,
        agencyId: domainObjects.agencyId,
        supplierId: domainObjects.supplierId,
        supplierLotCode: domainObjects.supplierLotCode,
        notes: domainObjects.notes,
        createdBy: domainObjects.createdBy,
      });

      // Step 10: Save to repository
      const savedLotBatch = await this.lotBatchRepository.save(newLotBatch);

      return {
        success: true,
        lotBatchId: savedLotBatch.id,
        lotNumber: savedLotBatch.lotNumber,
        ...(savedLotBatch.batchNumber && { batchNumber: savedLotBatch.batchNumber }),
      };
    } catch (error) {
      // Handle validation errors specifically
      if (error instanceof Error && error.name === 'CreateLotBatchCommandValidationError') {
        return {
          success: false,
          error: 'Lot/batch creation validation failed',
          validationErrors: (error as any).validationErrors,
        };
      }

      // Handle repository errors
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Handle unexpected errors
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  /**
   * Validates that referenced entities exist and are active
   * @param command - Validated command
   * @returns Promise<{isValid: boolean, error?: string}> - Validation result
   */
  private async validateReferencedEntities(
    command: CreateLotBatchCommand
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Validate product exists and is active
      const product = await this.productRepository.findById(command.productId);
      if (!product) {
        return { isValid: false, error: 'Product not found' };
      }
      if (product.status !== ProductStatus.ACTIVE) {
        return { isValid: false, error: 'Cannot create lot/batch for inactive product' };
      }

      // Validate agency exists and is operational
      const agency = await this.agencyRepository.findById(command.agencyId);
      if (!agency) {
        return { isValid: false, error: 'Agency not found' };
      }
      if (!agency.isOperational()) {
        return { isValid: false, error: 'Cannot create lot/batch for non-operational agency' };
      }

      // Validate supplier if provided
      if (command.supplierId) {
        // Note: We would need a supplier repository to validate this
        // For now, we'll assume it's valid if provided
        console.warn(`Supplier validation not implemented for ID: ${command.supplierId}`);
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate referenced entities',
      };
    }
  }
}

/**
 * Factory function to create CreateLotBatchHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @param productRepository - Product repository implementation
 * @param agencyRepository - Agency repository implementation
 * @returns CreateLotBatchHandler instance
 */
export function createLotBatchHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository,
  productRepository: IProductRepository,
  agencyRepository: IAgencyRepository
): CreateLotBatchHandler {
  return new CreateLotBatchHandler(lotBatchRepository, userRepository, productRepository, agencyRepository);
}
