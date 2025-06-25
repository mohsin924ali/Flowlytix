/**
 * Search Lot/Batches Handler Tests
 *
 * Comprehensive test suite for SearchLotBatchesHandler following established patterns.
 * Tests authorization, validation, business rules, search functionality, and error scenarios.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { SearchLotBatchesHandler } from '../search-lot-batches.handler';
import { SearchLotBatchesQuery } from '../../../queries/lot-batch/search-lot-batches.query';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';
import { Permission } from '../../../../domain/value-objects/role';

// Mock repositories following the working pattern
const mockLotBatchRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  list: jest.fn(),
  findByProductId: jest.fn(),
  selectFifoLots: jest.fn(),
  reserveQuantity: jest.fn(),
  releaseReservation: jest.fn(),
  consumeQuantity: jest.fn(),
  adjustQuantity: jest.fn(),
};

const mockUserRepository = {
  findById: jest.fn(),
};

// Mock user with permissions
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  hasPermission: jest.fn(),
};

// Mock lot/batch entities for search results
const mockLotBatch1 = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  lotNumber: 'LOT001',
  batchNumber: 'BATCH001',
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  quantity: 1000,
  remainingQuantity: 800,
  reservedQuantity: 100,
  availableQuantity: 700,
  status: LotStatus.ACTIVE,
  productId: '550e8400-e29b-41d4-a716-446655440002',
  agencyId: '550e8400-e29b-41d4-a716-446655440003',
  supplierId: '550e8400-e29b-41d4-a716-446655440005',
  supplierLotCode: 'SUP001',
  getDisplayInfo: jest.fn().mockReturnValue({
    manufacturingDate: '2024-01-01',
    expiryDate: '2024-12-31',
    isExpired: false,
    isNearExpiry: false,
    isAvailable: true,
    daysUntilExpiry: 300,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
  }),
};

const mockLotBatch2 = {
  id: '550e8400-e29b-41d4-a716-446655440006',
  lotNumber: 'LOT002',
  batchNumber: 'BATCH002',
  manufacturingDate: new Date('2024-02-01'),
  expiryDate: new Date('2024-11-30'),
  quantity: 500,
  remainingQuantity: 250,
  reservedQuantity: 50,
  availableQuantity: 200,
  status: LotStatus.ACTIVE,
  productId: '550e8400-e29b-41d4-a716-446655440002',
  agencyId: '550e8400-e29b-41d4-a716-446655440003',
  supplierId: '550e8400-e29b-41d4-a716-446655440005',
  supplierLotCode: 'SUP002',
  getDisplayInfo: jest.fn().mockReturnValue({
    manufacturingDate: '2024-02-01',
    expiryDate: '2024-11-30',
    isExpired: false,
    isNearExpiry: true,
    isAvailable: true,
    daysUntilExpiry: 30,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-02T10:00:00Z',
  }),
};

describe('SearchLotBatchesHandler', () => {
  let handler: SearchLotBatchesHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new SearchLotBatchesHandler(mockLotBatchRepository as any, mockUserRepository as any);
  });

  describe('handle', () => {
    const validQuery = {
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      searchTerm: 'LOT001',
      limit: 50,
      offset: 0,
    };

    it('should search lot/batches successfully with valid query', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.lotBatches[0]?.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.lotBatches[0]?.lotNumber).toBe('LOT001');
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Requesting user not found');
      expect(result.lotBatches).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockLotBatchRepository.search).not.toHaveBeenCalled();
    });

    it('should return error when user lacks permission', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(false);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to search lot/batch records');
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.READ_PRODUCT);
      expect(result.lotBatches).toHaveLength(0);
      expect(mockLotBatchRepository.search).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [],
        total: 0,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const paginatedQuery = { ...validQuery, limit: 1, offset: 0 };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 2,
      });

      // Act
      const result = await handler.handle(paginatedQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(true); // More results available
    });

    it('should handle search by lot number', async () => {
      // Arrange
      const lotQuery = { ...validQuery, searchTerm: 'LOT001' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 1,
      });

      // Act
      const result = await handler.handle(lotQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(1);
      expect(result.lotBatches[0]?.lotNumber).toBe('LOT001');
    });

    it('should handle search by batch number', async () => {
      // Arrange
      const batchQuery = { ...validQuery, searchTerm: 'BATCH001' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 1,
      });

      // Act
      const result = await handler.handle(batchQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(1);
      expect(result.lotBatches[0]?.batchNumber).toBe('BATCH001');
    });

    it('should handle search by supplier lot code', async () => {
      // Arrange
      const supplierQuery = { ...validQuery, searchTerm: 'SUP001' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 1,
      });

      // Act
      const result = await handler.handle(supplierQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(1);
      expect(result.lotBatches[0]?.supplierLotCode).toBe('SUP001');
    });

    it('should handle status filtering', async () => {
      // Arrange
      const statusQuery = {
        ...validQuery,
        status: [LotStatus.ACTIVE],
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 1,
      });

      // Act
      const result = await handler.handle(statusQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(1);
      expect(result.lotBatches[0]?.status).toBe(LotStatus.ACTIVE);
    });

    it('should handle product filtering', async () => {
      // Arrange
      const productQuery = {
        ...validQuery,
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(productQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      expect(mockLotBatchRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: '550e8400-e29b-41d4-a716-446655440002',
        })
      );
    });

    it('should handle agency filtering', async () => {
      // Arrange
      const agencyQuery = {
        ...validQuery,
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(agencyQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      expect(mockLotBatchRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId: '550e8400-e29b-41d4-a716-446655440003',
        })
      );
    });

    it('should handle date range filtering', async () => {
      // Arrange
      const dateQuery = {
        ...validQuery,
        manufacturingDateFrom: new Date('2024-01-01'),
        manufacturingDateTo: new Date('2024-12-31'),
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(dateQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
    });

    it('should convert lot/batch to summary correctly', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1],
        total: 1,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches[0]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440001',
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        quantity: 1000,
        remainingQuantity: 800,
        reservedQuantity: 100,
        availableQuantity: 700,
        status: LotStatus.ACTIVE,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        supplierId: '550e8400-e29b-41d4-a716-446655440005',
        supplierLotCode: 'SUP001',
        isExpired: false,
        isNearExpiry: false,
        isAvailable: true,
        daysUntilExpiry: 300,
      });
    });

    it('should handle expired lots in search results', async () => {
      // Arrange
      const expiredLot = {
        ...mockLotBatch1,
        getDisplayInfo: jest.fn().mockReturnValue({
          ...mockLotBatch1.getDisplayInfo(),
          isExpired: true,
          daysUntilExpiry: -10,
        }),
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [expiredLot],
        total: 1,
      });

      // Act
      const result = await handler.handle({ ...validQuery, includeExpired: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches[0]?.isExpired).toBe(true);
      expect(result.lotBatches[0]?.daysUntilExpiry).toBe(-10);
    });

    it('should handle near expiry lots correctly', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch2],
        total: 1,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches[0]?.isNearExpiry).toBe(true);
      expect(result.lotBatches[0]?.daysUntilExpiry).toBe(30);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockRejectedValue(new Error('Repository error'));

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository error');
      expect(result.lotBatches).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle invalid query format', async () => {
      // Arrange
      const invalidQuery = {
        requestedBy: 'invalid-uuid',
        searchTerm: 'LOT001',
      };

      // Act
      const result = await handler.handle(invalidQuery as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(result.lotBatches).toHaveLength(0);
    });

    it('should handle empty search term', async () => {
      // Arrange
      const emptyQuery = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        searchTerm: '',
        limit: 50,
        offset: 0,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(emptyQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      // Empty search term should return all results
    });

    it('should handle sorting options', async () => {
      // Arrange
      const sortedQuery = {
        ...validQuery,
        sortBy: 'expiryDate' as const,
        sortOrder: 'DESC' as const,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch2, mockLotBatch1],
        total: 2,
      });

      // Act
      const result = await handler.handle(sortedQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      // Results should be sorted by expiry date in descending order
    });

    it('should handle FIFO ordering', async () => {
      // Arrange
      const fifoQuery = {
        ...validQuery,
        fifoOrder: true,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(fifoQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      // FIFO should prioritize older manufacturing dates (mockLotBatch1 is older)
      expect(result.lotBatches[0]?.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    });
  });
});
