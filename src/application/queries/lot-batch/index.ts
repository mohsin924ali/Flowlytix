/**
 * Lot/Batch Queries Index
 *
 * Centralized export point for all lot/batch query operations.
 * Provides comprehensive query capabilities for lot/batch management
 * following CQRS pattern and hexagonal architecture principles.
 *
 * @domain Lot/Batch Management
 * @pattern Query Index (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

// Search Lot/Batches Query - Comprehensive search with filtering
export type { SearchLotBatchesQuery, SearchLotBatchesQueryResult, LotBatchSummary } from './search-lot-batches.query';

export {
  SearchLotBatchesQuerySchema,
  SearchLotBatchesQueryValidationError,
  validateSearchLotBatchesQuery,
  getAppliedFilters,
  prepareSearchCriteria,
} from './search-lot-batches.query';

// Get Lot/Batch Query - Single lot/batch retrieval with details
export type {
  GetLotBatchQuery,
  GetLotBatchQueryResult,
  LotBatchDetails,
  LotBatchQuantityHistory,
  RelatedLotBatchSummary,
} from './get-lot-batch.query';

export {
  GetLotBatchQuerySchema,
  GetLotBatchQueryValidationError,
  validateGetLotBatchQuery,
  createLotBatchDetails,
  createRelatedLotSummary,
} from './get-lot-batch.query';

// List Lot/Batches Query - Simplified listing for UI components
export type { ListLotBatchesQuery, ListLotBatchesQueryResult, LotBatchListItem } from './list-lot-batches.query';

export {
  ListLotBatchesQuerySchema,
  ListLotBatchesQueryValidationError,
  validateListLotBatchesQuery,
  createLotBatchListItem,
  prepareListSearchCriteria,
  getListAppliedFilters,
} from './list-lot-batches.query';
