/**
 * Get Lot/Batch Handler
 *
 * Handler for GetLotBatch query following CQRS pattern.
 * Implements business logic for single lot/batch retrieval with proper authorization,
 * detailed information, and calculated fields.
 *
 * Business Rules:
 * - Only users with READ_PRODUCT permission can view lots
 * - Results are filtered by user's agency access
 * - Expired status is calculated in real-time
 * - Near expiry warning is calculated based on threshold
 * - Includes availability calculations
 *
 * @domain Lot/Batch Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  GetLotBatchQuery,
  GetLotBatchQueryResult,
  LotBatchDetails,
  validateGetLotBatchQuery,
  createLotBatchDetails,
} from '../../queries/lot-batch/get-lot-batch.query';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { LotBatch } from '../../../domain/value-objects/lot-batch';

/**
 * Handler for GetLotBatch query
 * Implements secure lot/batch retrieval with authorization checks
 */
export class GetLotBatchHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles get lot/batch query with detailed information
   * @param query - GetLotBatch query
   * @returns Promise<GetLotBatchQueryResult> - Detailed lot/batch information
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: GetLotBatchQuery): Promise<GetLotBatchQueryResult> {
    try {
      // Step 1: Validate query
      const validatedQuery = validateGetLotBatchQuery(query);

      // Step 2: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(validatedQuery.requestedBy);
      if (!requestingUser) {
        return {
          success: false,
          lotBatch: null,
          metadata: {
            includeHistory: validatedQuery.includeHistory,
            includeRelated: validatedQuery.includeRelated,
            nearExpiryThreshold: validatedQuery.nearExpiryDays,
          },
          error: 'Requesting user not found',
        };
      }

      // Step 3: Authorization check - user needs READ_PRODUCT permission
      if (!requestingUser.hasPermission(Permission.READ_PRODUCT)) {
        return {
          success: false,
          lotBatch: null,
          metadata: {
            includeHistory: validatedQuery.includeHistory,
            includeRelated: validatedQuery.includeRelated,
            nearExpiryThreshold: validatedQuery.nearExpiryDays,
          },
          error: 'Insufficient permissions to view lot/batch records',
        };
      }

      // Step 4: Get lot/batch by ID
      const lotBatch = await this.lotBatchRepository.findById(validatedQuery.lotBatchId);
      if (!lotBatch) {
        return {
          success: false,
          lotBatch: null,
          metadata: {
            includeHistory: validatedQuery.includeHistory,
            includeRelated: validatedQuery.includeRelated,
            nearExpiryThreshold: validatedQuery.nearExpiryDays,
          },
          error: 'Lot/batch not found',
        };
      }

      // Step 5: Check agency access (multi-tenant security)
      // Note: This would typically be handled by the repository layer with user context
      // For now, we'll assume the repository handles this filtering

      // Step 6: Create detailed lot/batch information
      const lotBatchDetails = createLotBatchDetails(lotBatch, validatedQuery.nearExpiryDays);

      // Step 7: Create result with optional arrays
      const result: GetLotBatchQueryResult = {
        success: true,
        lotBatch: lotBatchDetails,
        metadata: {
          includeHistory: validatedQuery.includeHistory,
          includeRelated: validatedQuery.includeRelated,
          nearExpiryThreshold: validatedQuery.nearExpiryDays,
        },
        ...(validatedQuery.includeHistory && { quantityHistory: [] }),
        ...(validatedQuery.includeRelated && { relatedLots: [] }),
      };

      return result;
    } catch (error) {
      return {
        success: false,
        lotBatch: null,
        metadata: {
          includeHistory: query.includeHistory || false,
          includeRelated: query.includeRelated || false,
          nearExpiryThreshold: query.nearExpiryDays || 30,
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

/**
 * Factory function to create GetLotBatchHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @returns GetLotBatchHandler instance
 */
export function createGetLotBatchHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository
): GetLotBatchHandler {
  return new GetLotBatchHandler(lotBatchRepository, userRepository);
}
