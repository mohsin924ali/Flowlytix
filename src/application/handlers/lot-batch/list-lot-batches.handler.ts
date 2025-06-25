/**
 * List Lot/Batches Handler
 *
 * Handler for ListLotBatches query following CQRS pattern.
 * Implements business logic for simplified lot/batch listing with proper authorization,
 * optimized for UI components like dropdowns and selection lists.
 *
 * Business Rules:
 * - Only users with READ_PRODUCT permission can list lots
 * - Requires either productId or agencyId (business rule validation)
 * - Default FIFO ordering with override options
 * - Status filtering with default to ACTIVE only
 * - Smaller pagination limits optimized for UI
 *
 * @domain Lot/Batch Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  ListLotBatchesQuery,
  ListLotBatchesQueryResult,
  LotBatchListItem,
  validateListLotBatchesQuery,
  prepareListSearchCriteria,
} from '../../queries/lot-batch/list-lot-batches.query';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { LotBatch } from '../../../domain/value-objects/lot-batch';

/**
 * Handler for ListLotBatches query
 * Implements secure lot/batch listing with authorization checks and filtering
 */
export class ListLotBatchesHandler {
  constructor(
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles list lot/batches query with filtering and pagination
   * @param query - ListLotBatches query with filters
   * @returns Promise<ListLotBatchesQueryResult> - Paginated list results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: ListLotBatchesQuery): Promise<ListLotBatchesQueryResult> {
    try {
      // Step 1: Validate query
      const validatedQuery = validateListLotBatchesQuery(query);

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
          error: 'Insufficient permissions to list lot/batch records',
          lotBatches: [],
          total: 0,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          hasMore: false,
        };
      }

      // Step 4: Build search criteria from query
      const searchCriteria = prepareListSearchCriteria(validatedQuery);

      // Step 5: Execute search through repository
      const searchResult = await this.lotBatchRepository.search(searchCriteria);

      // Step 6: Convert lot/batches to list items
      const lotBatchListItems: LotBatchListItem[] = searchResult.lotBatches.map((lotBatch) =>
        this.convertLotBatchToListItem(lotBatch)
      );

      // Step 7: Calculate pagination metadata
      const hasMore = searchResult.total > validatedQuery.offset + validatedQuery.limit;

      return {
        success: true,
        lotBatches: lotBatchListItems,
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
   * Converts LotBatch entity to LotBatchListItem
   * @private
   */
  private convertLotBatchToListItem(lotBatch: LotBatch): LotBatchListItem {
    const displayInfo = lotBatch.getDisplayInfo();

    return {
      id: lotBatch.id,
      lotNumber: lotBatch.lotNumber,
      batchNumber: lotBatch.batchNumber,
      manufacturingDate: displayInfo.manufacturingDate,
      expiryDate: displayInfo.expiryDate,
      remainingQuantity: lotBatch.remainingQuantity,
      availableQuantity: lotBatch.availableQuantity,
      status: lotBatch.status,
      productId: lotBatch.productId,
      isExpired: displayInfo.isExpired,
      isNearExpiry: displayInfo.isNearExpiry,
      daysUntilExpiry: displayInfo.daysUntilExpiry,
      displayText: this.createDisplayText(lotBatch, displayInfo),
    };
  }

  /**
   * Creates display text for UI components
   * @private
   */
  private createDisplayText(lotBatch: LotBatch, displayInfo: any): string {
    const lotBatchCode = lotBatch.batchNumber ? `${lotBatch.lotNumber}-${lotBatch.batchNumber}` : lotBatch.lotNumber;
    const quantityText = `${lotBatch.remainingQuantity} units`;

    let statusText = '';
    if (displayInfo.isExpired) {
      statusText = ' (EXPIRED)';
    } else if (displayInfo.isNearExpiry) {
      statusText = ` (Expires in ${displayInfo.daysUntilExpiry} days)`;
    }

    return `${lotBatchCode} - ${quantityText}${statusText}`;
  }
}

/**
 * Factory function to create ListLotBatchesHandler
 * @param lotBatchRepository - Lot/batch repository implementation
 * @param userRepository - User repository implementation
 * @returns ListLotBatchesHandler instance
 */
export function createListLotBatchesHandler(
  lotBatchRepository: ILotBatchRepository,
  userRepository: IUserRepository
): ListLotBatchesHandler {
  return new ListLotBatchesHandler(lotBatchRepository, userRepository);
}
