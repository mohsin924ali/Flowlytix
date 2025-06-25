/**
 * Search Lot/Batches Handler
 *
 * Handler for SearchLotBatches query following CQRS pattern.
 * Implements business logic for lot/batch search with proper authorization,
 * filtering, pagination, and sorting capabilities.
 *
 * Business Rules:
 * - Only users with READ_PRODUCT permission can search lots
 * - Results are filtered by user's agency access
 * - FIFO ordering prioritizes older manufacturing dates
 * - Expired lots are included but clearly marked
 * - Search supports lot numbers, batch numbers, and supplier codes
 *
 * @domain Lot/Batch Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  SearchLotBatchesQuery,
  SearchLotBatchesQueryResult,
  LotBatchSummary,
  validateSearchLotBatchesQuery,
  prepareSearchCriteria,
} from '../../queries/lot-batch/search-lot-batches.query';
import { ILotBatchRepository, LotBatchSearchCriteria } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { LotBatch } from '../../../domain/value-objects/lot-batch';

/**
 * Handler for SearchLotBatches query
 * Implements secure lot/batch search with authorization checks and filtering
 */
export class SearchLotBatchesHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles search lot/batches query with filtering and pagination
   * @param query - SearchLotBatches query with filters
   * @returns Promise<SearchLotBatchesQueryResult> - Paginated search results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: SearchLotBatchesQuery): Promise<SearchLotBatchesQueryResult> {
    try {
      // Step 1: Validate query
      const validatedQuery = validateSearchLotBatchesQuery(query);

      // Step 2: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(validatedQuery.requestedBy);
      if (!requestingUser) {
        return {
          success: false,
          error: 'Requesting user not found',
          lotBatches: [],
          total: 0,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          hasMore: false,
        };
      }

      // Step 3: Authorization check - user needs READ_PRODUCT permission
      if (!requestingUser.hasPermission(Permission.READ_PRODUCT)) {
        return {
          success: false,
          error: 'Insufficient permissions to search lot/batch records',
          lotBatches: [],
          total: 0,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          hasMore: false,
        };
      }

      // Step 4: Build search criteria from query
      const searchCriteria = prepareSearchCriteria(validatedQuery);

      // Step 5: Execute search through repository
      const searchResult = await this.lotBatchRepository.search(searchCriteria);

      // Step 6: Convert lot/batches to summary results
      const lotBatchSummaries: LotBatchSummary[] = searchResult.lotBatches.map((lotBatch) =>
        this.convertLotBatchToSummary(lotBatch)
      );

      // Step 7: Calculate pagination metadata
      const hasMore = searchResult.total > validatedQuery.offset + validatedQuery.limit;

      return {
        success: true,
        lotBatches: lotBatchSummaries,
        total: searchResult.total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        lotBatches: [],
        total: 0,
        limit: query.limit || 50,
        offset: query.offset || 0,
        hasMore: false,
      };
    }
  }

  /**
   * Converts LotBatch entity to LotBatchSummary
   * @private
   */
  private convertLotBatchToSummary(lotBatch: LotBatch): LotBatchSummary {
    const displayInfo = lotBatch.getDisplayInfo();

    return {
      id: lotBatch.id,
      lotNumber: lotBatch.lotNumber,
      batchNumber: lotBatch.batchNumber,
      manufacturingDate: displayInfo.manufacturingDate,
      expiryDate: displayInfo.expiryDate,
      quantity: lotBatch.quantity,
      remainingQuantity: lotBatch.remainingQuantity,
      reservedQuantity: lotBatch.reservedQuantity,
      availableQuantity: lotBatch.availableQuantity,
      status: lotBatch.status,
      productId: lotBatch.productId,
      agencyId: lotBatch.agencyId,
      supplierId: lotBatch.supplierId,
      supplierLotCode: lotBatch.supplierLotCode,
      isExpired: displayInfo.isExpired,
      isNearExpiry: displayInfo.isNearExpiry,
      isAvailable: displayInfo.isAvailable,
      daysUntilExpiry: displayInfo.daysUntilExpiry,
      createdAt: displayInfo.createdAt,
      updatedAt: displayInfo.updatedAt,
    };
  }
}

/**
 * Factory function to create SearchLotBatchesHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @returns SearchLotBatchesHandler instance
 */
export function createSearchLotBatchesHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository
): SearchLotBatchesHandler {
  return new SearchLotBatchesHandler(lotBatchRepository, userRepository);
}
