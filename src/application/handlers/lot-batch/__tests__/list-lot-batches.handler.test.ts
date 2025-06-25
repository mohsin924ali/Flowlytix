/**
 * List Lot/Batches Handler Tests
 *
 * Comprehensive test suite for ListLotBatchesHandler following established patterns.
 * Tests authorization, validation, business rules, filtering, and pagination.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { ListLotBatchesHandler } from '../list-lot-batches.handler';
import { ListLotBatchesQuery } from '../../../queries/lot-batch/list-lot-batches.query';
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

describe('ListLotBatchesHandler', () => {
  let handler: ListLotBatchesHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ListLotBatchesHandler(mockLotBatchRepository as any, mockUserRepository as any);
  });

  describe('handle', () => {
    const validQuery: ListLotBatchesQuery = {
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      productId: '550e8400-e29b-41d4-a716-446655440002',
      includeExpired: false,
      includeInactive: false,
      hasQuantityOnly: true,
      limit: 50,
      offset: 0,
      sortBy: 'manufacturingDate',
      sortOrder: 'ASC',
      fifoOrder: true,
    };

    it('should list lot/batches successfully with valid query', async () => {
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
      expect(result.lotBatches[0]?.displayText).toContain('LOT001-BATCH001');
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
      expect(result.error).toBe('Insufficient permissions to list lot/batch records');
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.READ_PRODUCT);
      expect(result.lotBatches).toHaveLength(0);
      expect(mockLotBatchRepository.search).not.toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
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

    it('should handle filtering by agency ID', async () => {
      // Arrange
      const agencyQuery: ListLotBatchesQuery = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        includeExpired: false,
        includeInactive: false,
        hasQuantityOnly: true,
        limit: 50,
        offset: 0,
        sortBy: 'manufacturingDate',
        sortOrder: 'ASC',
        fifoOrder: true,
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

    it('should handle status filtering', async () => {
      // Arrange
      const statusQuery = {
        ...validQuery,
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
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
    });

    it('should handle sorting options', async () => {
      // Arrange
      const sortedQuery = {
        ...validQuery,
        sortBy: 'expiryDate' as const,
        sortOrder: 'DESC' as const,
        fifoOrder: false,
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
    });

    it('should convert lot/batch to list item correctly', async () => {
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
        remainingQuantity: 800,
        availableQuantity: 700,
        status: LotStatus.ACTIVE,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        isExpired: false,
        isNearExpiry: false,
        daysUntilExpiry: 300,
      });
      expect(result.lotBatches[0]?.displayText).toBeDefined();
    });

    it('should include expired lots when requested', async () => {
      // Arrange
      const expiredQuery = {
        ...validQuery,
        includeExpired: true,
      };
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
      const result = await handler.handle(expiredQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches[0]?.isExpired).toBe(true);
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
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };

      // Act
      const result = await handler.handle(invalidQuery as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(result.lotBatches).toHaveLength(0);
    });

    it('should validate required association fields', async () => {
      // Arrange
      const queryWithoutAssociation = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        limit: 50,
        offset: 0,
      };

      // Act
      const result = await handler.handle(queryWithoutAssociation as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Either productId or agencyId must be provided');
    });

    it('should handle FIFO ordering correctly', async () => {
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
      expect(result.lotBatches[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should filter lots by quantity when hasQuantityOnly is true', async () => {
      // Arrange
      const quantityQuery = {
        ...validQuery,
        hasQuantityOnly: true,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.search.mockResolvedValue({
        lotBatches: [mockLotBatch1, mockLotBatch2],
        total: 2,
      });

      // Act
      const result = await handler.handle(quantityQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatches).toHaveLength(2);
      // Both lots have remaining quantity > 0
      expect(result.lotBatches[0].remainingQuantity).toBeGreaterThan(0);
      expect(result.lotBatches[1].remainingQuantity).toBeGreaterThan(0);
    });
  });
});
