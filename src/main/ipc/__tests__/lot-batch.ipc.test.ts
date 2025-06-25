/**
 * Lot/Batch IPC Handler Tests - Step 1: CreateLotBatch Endpoint
 *
 * Comprehensive test suite for lot/batch IPC operations following established patterns.
 * Tests authorization, validation, business rules, and error handling for the create endpoint.
 *
 * @domain Lot/Batch Management
 * @pattern IPC Handler Tests
 * @version 1.0.0
 */

import {
  LotBatchIpcHandler,
  CreateLotBatchRequestSchema,
  GetLotBatchRequestSchema,
  UpdateLotBatchRequestSchema,
  DeleteLotBatchRequestSchema,
  ListLotBatchRequestSchema,
  SearchLotBatchRequestSchema,
  LotBatchIpcResponse,
  CreateLotBatchResponse,
  GetLotBatchResponse,
  UpdateLotBatchResponse,
  DeleteLotBatchResponse,
  ListLotBatchResponse,
  SearchLotBatchResponse,
} from '../lot-batch.ipc';
import { LotStatus } from '../../../domain/value-objects/lot-batch';
import { Permission } from '../../../domain/value-objects/role';
import { DeleteType } from '../../../application/commands/lot-batch/delete-lot-batch.command';

// Mock repositories following established patterns
const mockLotBatchRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByLotNumber: jest.fn(),
  findByLotAndBatchNumber: jest.fn(),
  search: jest.fn(),
  list: jest.fn(),
};

const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  exists: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
};

const mockAgencyRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
};

// Mock user with permissions
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  hasPermission: jest.fn(),
};

// Mock product entity
const mockProduct = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  status: 'ACTIVE',
};

// Mock agency entity
const mockAgency = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  isOperational: jest.fn().mockReturnValue(true),
};

// Mock created lot/batch
const mockCreatedLotBatch = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  lotNumber: 'LOT001',
  batchNumber: 'BATCH001',
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  quantity: 1000,
  remainingQuantity: 1000,
  reservedQuantity: 0,
  availableQuantity: 1000,
  status: LotStatus.ACTIVE,
  productId: '550e8400-e29b-41d4-a716-446655440002',
  agencyId: '550e8400-e29b-41d4-a716-446655440003',
  supplierId: '550e8400-e29b-41d4-a716-446655440005',
  supplierLotCode: 'SUP001',
  notes: 'Test lot batch',
  createdBy: '550e8400-e29b-41d4-a716-446655440004',
  createdAt: new Date('2024-01-01T10:00:00Z'),
};

// Mock lot/batch details for get operation
const mockLotBatchDetails = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  lotNumber: 'LOT001',
  batchNumber: 'BATCH001',
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  quantity: 1000,
  remainingQuantity: 800,
  reservedQuantity: 100,
  availableQuantity: 700,
  consumedQuantity: 200,
  status: LotStatus.ACTIVE,
  productId: '550e8400-e29b-41d4-a716-446655440002',
  agencyId: '550e8400-e29b-41d4-a716-446655440003',
  supplierId: '550e8400-e29b-41d4-a716-446655440005',
  supplierLotCode: 'SUP001',
  notes: 'Test lot batch',
  createdBy: '550e8400-e29b-41d4-a716-446655440004',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedBy: '550e8400-e29b-41d4-a716-446655440004',
  updatedAt: new Date('2024-01-02T10:00:00Z'),
  isExpired: false,
  isNearExpiry: false,
  daysUntilExpiry: 330,
  isAvailable: true,
  isFullyConsumed: false,
  utilizationPercentage: 20,
  displayInfo: {
    lotBatchCode: 'LOT001-BATCH001',
    statusDisplay: 'Active',
    quantityDisplay: '800/1000 units',
    expiryDisplay: '330 days remaining',
    availabilityDisplay: '700 available (100 reserved)',
  },
};

describe('LotBatchIpcHandler - Lot/Batch Operations', () => {
  let handler: LotBatchIpcHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create handler instance (temporarily skip the missing signatures issue)
    handler = new (LotBatchIpcHandler as any)(
      mockLotBatchRepository,
      mockUserRepository,
      mockProductRepository,
      mockAgencyRepository
    );
  });

  describe('CreateLotBatch IPC Request Schema Validation', () => {
    it('should validate valid create lot/batch request', () => {
      const validRequest = {
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        manufacturingDate: '2024-01-01T10:00:00.000Z',
        expiryDate: '2024-12-31T10:00:00.000Z',
        quantity: 1000,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        supplierId: '550e8400-e29b-41d4-a716-446655440005',
        supplierLotCode: 'SUP001',
        notes: 'Test lot batch for validation',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = CreateLotBatchRequestSchema.parse(validRequest);
      expect(result.lotNumber).toBe('LOT001');
      expect(result.batchNumber).toBe('BATCH001');
      expect(result.quantity).toBe(1000);
      expect(result.manufacturingDate).toBeInstanceOf(Date);
      expect(result.expiryDate).toBeInstanceOf(Date);
    });

    it('should reject invalid lot number format', () => {
      const invalidRequest = {
        lotNumber: 'lot001', // lowercase not allowed
        manufacturingDate: '2024-01-01T10:00:00.000Z',
        quantity: 1000,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => CreateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject future manufacturing date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const invalidRequest = {
        lotNumber: 'LOT001',
        manufacturingDate: futureDate.toISOString(),
        quantity: 1000,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => CreateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        lotNumber: 'LOT001',
        manufacturingDate: '2024-01-01T10:00:00.000Z',
        quantity: 1000,
        productId: 'invalid-uuid',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => CreateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject negative or zero quantity', () => {
      const invalidRequest = {
        lotNumber: 'LOT001',
        manufacturingDate: '2024-01-01T10:00:00.000Z',
        quantity: -100,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => CreateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleCreateLotBatch Method', () => {
    const validCreateRequest = {
      lotNumber: 'LOT001',
      batchNumber: 'BATCH001',
      manufacturingDate: '2024-01-01T10:00:00.000Z',
      expiryDate: '2024-12-31T10:00:00.000Z',
      quantity: 1000,
      productId: '550e8400-e29b-41d4-a716-446655440002',
      agencyId: '550e8400-e29b-41d4-a716-446655440003',
      supplierId: '550e8400-e29b-41d4-a716-446655440005',
      supplierLotCode: 'SUP001',
      notes: 'Test lot batch',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should create lot/batch successfully with valid request', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);
      mockLotBatchRepository.findByLotAndBatchNumber.mockResolvedValue(null);
      mockLotBatchRepository.save.mockResolvedValue(mockCreatedLotBatch);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.data?.lotNumber).toBe('LOT001');
      expect(result.data?.batchNumber).toBe('BATCH001');
      expect(result.data?.message).toBe('Lot/batch created successfully');
      expect(result.operation).toBe('create-lot-batch');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creating user not found');
    });

    it('should return error when user lacks permission', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(false);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create lot/batch records');
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.CREATE_PRODUCT);
    });

    it('should return error when product not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('should return error when agency not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency not found');
    });

    it('should return error when lot number already exists', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(mockCreatedLotBatch);

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Lot number 'LOT001' already exists for this product");
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        lotNumber: '', // Invalid empty lot number
        manufacturingDate: '2024-01-01T10:00:00.000Z',
        quantity: 1000,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);
      mockLotBatchRepository.findByLotAndBatchNumber.mockResolvedValue(null);
      mockLotBatchRepository.save.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await (handler as any).handleCreateLotBatch({}, validCreateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('GetLotBatch IPC Request Schema Validation', () => {
    it('should validate valid get lot/batch request', () => {
      const validRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        includeHistory: true,
        includeRelated: true,
        nearExpiryDays: 45,
      };

      const result = GetLotBatchRequestSchema.parse(validRequest);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440004');
      expect(result.includeHistory).toBe(true);
      expect(result.includeRelated).toBe(true);
      expect(result.nearExpiryDays).toBe(45);
    });

    it('should apply default values for optional fields', () => {
      const minimalRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = GetLotBatchRequestSchema.parse(minimalRequest);
      expect(result.includeHistory).toBe(false);
      expect(result.includeRelated).toBe(false);
      expect(result.nearExpiryDays).toBe(30);
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        lotBatchId: 'invalid-uuid',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => GetLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid nearExpiryDays values', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        nearExpiryDays: 0, // Invalid value
      };

      expect(() => GetLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleGetLotBatch Method', () => {
    const validGetRequest = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      includeHistory: false,
      includeRelated: false,
      nearExpiryDays: 30,
    };

    it('should get lot/batch successfully with valid request', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        lotBatch: mockLotBatchDetails,
        metadata: {
          includeHistory: false,
          includeRelated: false,
          nearExpiryThreshold: 30,
        },
      };

      // Mock handler call directly since we can't instantiate properly in test
      const mockGetHandler = {
        handle: jest.fn().mockResolvedValue(mockQueryResult),
      };
      (handler as any).getLotBatchHandler = mockGetHandler;

      // Act
      const result = await (handler as any).handleGetLotBatch({}, validGetRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatch).toEqual(mockLotBatchDetails);
      expect(result.data?.metadata.includeHistory).toBe(false);
      expect(result.data?.metadata.includeRelated).toBe(false);
      expect(result.data?.metadata.nearExpiryThreshold).toBe(30);
      expect(result.operation).toBe('get-lot-batch');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should return error when lot/batch not found', async () => {
      // Arrange
      const mockQueryResult = {
        success: false,
        error: 'Lot/batch not found',
        lotBatch: null,
        metadata: {
          includeHistory: false,
          includeRelated: false,
          nearExpiryThreshold: 30,
        },
      };

      const mockGetHandler = {
        handle: jest.fn().mockResolvedValue(mockQueryResult),
      };
      (handler as any).getLotBatchHandler = mockGetHandler;

      // Act
      const result = await (handler as any).handleGetLotBatch({}, validGetRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Lot/batch not found');
    });

    it('should handle request with history and related lots', async () => {
      // Arrange
      const requestWithExtras = {
        ...validGetRequest,
        includeHistory: true,
        includeRelated: true,
      };

      const mockQuantityHistory = [
        {
          id: 'hist001',
          changeDate: new Date('2024-01-01T10:00:00Z'),
          changeType: 'CREATED' as const,
          quantityBefore: 0,
          quantityAfter: 1000,
          quantityChange: 1000,
          reason: 'Initial creation',
          referenceId: null,
          referenceType: null,
          performedBy: '550e8400-e29b-41d4-a716-446655440004',
          notes: 'Lot created',
        },
      ];

      const mockRelatedLots = [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          lotNumber: 'LOT002',
          batchNumber: 'BATCH001',
          manufacturingDate: new Date('2024-01-02'),
          expiryDate: new Date('2024-12-31'),
          remainingQuantity: 500,
          status: LotStatus.ACTIVE,
          isExpired: false,
          daysUntilExpiry: 329,
        },
      ];

      const mockQueryResult = {
        success: true,
        lotBatch: mockLotBatchDetails,
        quantityHistory: mockQuantityHistory,
        relatedLots: mockRelatedLots,
        metadata: {
          includeHistory: true,
          includeRelated: true,
          nearExpiryThreshold: 30,
        },
      };

      const mockGetHandler = {
        handle: jest.fn().mockResolvedValue(mockQueryResult),
      };
      (handler as any).getLotBatchHandler = mockGetHandler;

      // Act
      const result = await (handler as any).handleGetLotBatch({}, requestWithExtras);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.quantityHistory).toEqual(mockQuantityHistory);
      expect(result.data?.relatedLots).toEqual(mockRelatedLots);
      expect(result.data?.metadata.includeHistory).toBe(true);
      expect(result.data?.metadata.includeRelated).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        lotBatchId: '', // Invalid empty ID
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await (handler as any).handleGetLotBatch({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle handler errors gracefully', async () => {
      // Arrange
      const mockGetHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      (handler as any).getLotBatchHandler = mockGetHandler;

      // Act
      const result = await (handler as any).handleGetLotBatch({}, validGetRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('UpdateLotBatch IPC Request Schema Validation', () => {
    it('should validate valid complete update lot/batch request', () => {
      const validRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        expiryDate: '2025-12-31T00:00:00Z',
        status: LotStatus.QUARANTINE,
        supplierId: '550e8400-e29b-41d4-a716-446655440005',
        supplierLotCode: 'SUPPLIER-LOT-001',
        notes: 'Updated due to quality review',
        reason: 'Quality control review required additional time',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = UpdateLotBatchRequestSchema.parse(validRequest);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.expiryDate).toBeInstanceOf(Date);
      expect(result.status).toBe(LotStatus.QUARANTINE);
      expect(result.supplierId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.supplierLotCode).toBe('SUPPLIER-LOT-001');
      expect(result.notes).toBe('Updated due to quality review');
      expect(result.reason).toBe('Quality control review required additional time');
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440004');
    });

    it('should validate partial update request with only status', () => {
      const partialRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        status: LotStatus.ACTIVE,
        reason: 'Reactivating lot after quality check',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = UpdateLotBatchRequestSchema.parse(partialRequest);
      expect(result.status).toBe(LotStatus.ACTIVE);
      expect(result.expiryDate).toBeUndefined();
      expect(result.supplierId).toBeUndefined();
    });

    it('should validate partial update request with only notes', () => {
      const partialRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        notes: 'Updated inventory notes after review',
        reason: 'Administrative update',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = UpdateLotBatchRequestSchema.parse(partialRequest);
      expect(result.notes).toBe('Updated inventory notes after review');
    });

    it('should reject request with no updatable fields', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'No actual updates provided',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => UpdateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        lotBatchId: 'invalid-uuid',
        status: LotStatus.ACTIVE,
        reason: 'Valid reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => UpdateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject reason that is too short', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        status: LotStatus.ACTIVE,
        reason: 'Too', // Only 3 characters
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => UpdateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid expiry date format', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        expiryDate: 'not-a-date',
        reason: 'Valid update reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => UpdateLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleUpdateLotBatch Method', () => {
    const validUpdateRequest = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      status: LotStatus.QUARANTINE,
      notes: 'Moved to quarantine for quality review',
      reason: 'Quality control identified potential issue',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should update lot/batch successfully with valid request', async () => {
      // Arrange
      const mockUpdateResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        updatedFields: ['status', 'notes'],
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, validUpdateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.data?.updatedFields).toEqual(['status', 'notes']);
      expect(result.data?.message).toBe('Lot/batch updated successfully');
      expect(result.operation).toBe('update-lot-batch');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should handle partial update with only expiry date', async () => {
      // Arrange
      const partialUpdateRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        expiryDate: '2025-06-30T23:59:59Z',
        reason: 'Extended shelf life after testing',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const mockUpdateResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        updatedFields: ['expiryDate'],
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, partialUpdateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.updatedFields).toEqual(['expiryDate']);
      expect(mockUpdateHandler.handle).toHaveBeenCalledWith({
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        expiryDate: new Date('2025-06-30T23:59:59Z'),
        status: undefined,
        supplierId: undefined,
        supplierLotCode: undefined,
        notes: undefined,
        reason: 'Extended shelf life after testing',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      });
    });

    it('should return error when lot/batch not found', async () => {
      // Arrange
      const mockUpdateResult = {
        success: false,
        error: 'Lot/batch not found',
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, validUpdateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Lot/batch not found');
    });

    it('should return error for invalid status transition', async () => {
      // Arrange
      const mockUpdateResult = {
        success: false,
        error: 'Invalid status transition: cannot change from CONSUMED to ACTIVE',
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, validUpdateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid status transition: cannot change from CONSUMED to ACTIVE');
    });

    it('should return validation errors when business rules are violated', async () => {
      // Arrange
      const mockUpdateResult = {
        success: false,
        error: 'Business rule validation failed',
        validationErrors: {
          expiryDate: ['Cannot set expiry date in the past'],
          status: ['Invalid status transition'],
        },
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, validUpdateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual({
        expiryDate: ['Cannot set expiry date in the past'],
        status: ['Invalid status transition'],
      });
    });

    it('should handle request validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        lotBatchId: 'invalid-uuid',
        status: LotStatus.ACTIVE,
        reason: 'Valid reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle unexpected handler errors gracefully', async () => {
      // Arrange
      const mockUpdateHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, validUpdateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection lost');
    });

    it('should handle supplier updates correctly', async () => {
      // Arrange
      const supplierUpdateRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        supplierId: '550e8400-e29b-41d4-a716-446655440009',
        supplierLotCode: 'NEW-SUPPLIER-CODE',
        reason: 'Correcting supplier information',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const mockUpdateResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        updatedFields: ['supplierId', 'supplierLotCode'],
      };

      const mockUpdateHandler = {
        handle: jest.fn().mockResolvedValue(mockUpdateResult),
      };
      (handler as any).updateLotBatchHandler = mockUpdateHandler;

      // Act
      const result = await (handler as any).handleUpdateLotBatch({}, supplierUpdateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.updatedFields).toEqual(['supplierId', 'supplierLotCode']);
      expect(mockUpdateHandler.handle).toHaveBeenCalledWith({
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        expiryDate: undefined,
        status: undefined,
        supplierId: '550e8400-e29b-41d4-a716-446655440009',
        supplierLotCode: 'NEW-SUPPLIER-CODE',
        notes: undefined,
        reason: 'Correcting supplier information',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      });
    });
  });

  describe('DeleteLotBatch IPC Request Schema Validation', () => {
    it('should validate valid soft delete request', () => {
      const validRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.SOFT,
        reason: 'Lot expired and needs to be removed from active inventory',
        force: false,
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = DeleteLotBatchRequestSchema.parse(validRequest);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.deleteType).toBe(DeleteType.SOFT);
      expect(result.reason).toBe('Lot expired and needs to be removed from active inventory');
      expect(result.force).toBe(false);
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440004');
    });

    it('should validate valid hard delete request', () => {
      const validRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.HARD,
        reason: 'data_cleanup - Test data created during system testing phase',
        force: true,
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = DeleteLotBatchRequestSchema.parse(validRequest);
      expect(result.deleteType).toBe(DeleteType.HARD);
      expect(result.force).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      const minimalRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'Standard removal for consumed lot',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = DeleteLotBatchRequestSchema.parse(minimalRequest);
      expect(result.deleteType).toBe(DeleteType.SOFT); // Default
      expect(result.force).toBe(false); // Default
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        lotBatchId: 'invalid-uuid',
        reason: 'Valid deletion reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => DeleteLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject reason that is too short', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'Too', // Only 3 characters
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => DeleteLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject reason that is too long', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'A'.repeat(501), // 501 characters
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => DeleteLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid delete type', () => {
      const invalidRequest = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: 'INVALID_TYPE',
        reason: 'Valid deletion reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      expect(() => DeleteLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleDeleteLotBatch Method', () => {
    const validDeleteRequest = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      deleteType: DeleteType.SOFT,
      reason: 'Lot has been fully consumed and needs to be archived',
      force: false,
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should delete lot/batch successfully with soft delete', async () => {
      // Arrange
      const mockDeleteResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.SOFT,
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.data?.deleteType).toBe(DeleteType.SOFT);
      expect(result.data?.message).toBe('Lot/batch deleted successfully');
      expect(result.operation).toBe('delete-lot-batch');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should handle hard delete with warning', async () => {
      // Arrange
      const hardDeleteRequest = {
        ...validDeleteRequest,
        deleteType: DeleteType.HARD,
        reason: 'duplicate_entry - Duplicate lot created by system error',
        force: true,
      };

      const mockDeleteResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.HARD,
        warning: 'Hard delete performed - data permanently removed',
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, hardDeleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.deleteType).toBe(DeleteType.HARD);
      expect(result.data?.warning).toBe('Hard delete performed - data permanently removed');
      expect(mockDeleteHandler.handle).toHaveBeenCalledWith({
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.HARD,
        reason: 'duplicate_entry - Duplicate lot created by system error',
        force: true,
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      });
    });

    it('should return error when lot/batch not found', async () => {
      // Arrange
      const mockDeleteResult = {
        success: false,
        error: 'Lot/batch not found',
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Lot/batch not found');
    });

    it('should return error when lot has remaining quantity without force', async () => {
      // Arrange
      const mockDeleteResult = {
        success: false,
        error: 'Cannot delete lot LOT001: 500 units remaining. Use force=true to override.',
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete lot LOT001: 500 units remaining. Use force=true to override.');
    });

    it('should return error for hard delete without proper status', async () => {
      // Arrange
      const hardDeleteRequest = {
        ...validDeleteRequest,
        deleteType: DeleteType.HARD,
        force: false,
      };

      const mockDeleteResult = {
        success: false,
        error:
          'Hard delete requires lot to be CONSUMED or DAMAGED status. Current status: ACTIVE. Use soft delete instead or force=true to override.',
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, hardDeleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Hard delete requires lot to be CONSUMED or DAMAGED status');
    });

    it('should return validation errors when business rules are violated', async () => {
      // Arrange
      const mockDeleteResult = {
        success: false,
        error: 'Business rule validation failed',
        validationErrors: {
          reason: ['Deletion reason must be at least 10 characters long for non-forced deletions'],
          status: ['Cannot delete active lot with remaining quantity'],
        },
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual({
        reason: ['Deletion reason must be at least 10 characters long for non-forced deletions'],
        status: ['Cannot delete active lot with remaining quantity'],
      });
    });

    it('should handle request validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        lotBatchId: 'invalid-uuid',
        reason: 'Valid deletion reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle unexpected handler errors gracefully', async () => {
      // Arrange
      const mockDeleteHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Database transaction failed')),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database transaction failed');
    });

    it('should handle forced deletion with reserved quantity', async () => {
      // Arrange
      const forcedDeleteRequest = {
        ...validDeleteRequest,
        reason: 'Emergency deletion - System corruption detected in lot data',
        force: true,
      };

      const mockDeleteResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.SOFT,
        warning: 'Forced deletion performed - lot had reserved quantity',
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, forcedDeleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.warning).toBe('Forced deletion performed - lot had reserved quantity');
      expect(mockDeleteHandler.handle).toHaveBeenCalledWith({
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.SOFT,
        reason: 'Emergency deletion - System corruption detected in lot data',
        force: true,
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      });
    });

    it('should handle deletion without warning', async () => {
      // Arrange
      const mockDeleteResult = {
        success: true,
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        deleteType: DeleteType.SOFT,
        // No warning field
      };

      const mockDeleteHandler = {
        handle: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      (handler as any).deleteLotBatchHandler = mockDeleteHandler;

      // Act
      const result = await (handler as any).handleDeleteLotBatch({}, validDeleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.warning).toBeUndefined();
      expect(result.data?.message).toBe('Lot/batch deleted successfully');
    });
  });

  describe('ListLotBatch IPC Request Schema Validation', () => {
    it('should validate valid list request with productId', () => {
      const validRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        includeExpired: false,
        includeInactive: true,
        hasQuantityOnly: true,
        limit: 25,
        offset: 0,
        sortBy: 'expiryDate',
        sortOrder: 'DESC',
        fifoOrder: false,
      };

      const result = ListLotBatchRequestSchema.parse(validRequest);
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440004');
      expect(result.productId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(result.status).toEqual([LotStatus.ACTIVE, LotStatus.QUARANTINE]);
      expect(result.includeExpired).toBe(false);
      expect(result.includeInactive).toBe(true);
      expect(result.hasQuantityOnly).toBe(true);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('expiryDate');
      expect(result.sortOrder).toBe('DESC');
      expect(result.fifoOrder).toBe(false);
    });

    it('should validate valid list request with agencyId', () => {
      const validRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        status: LotStatus.ACTIVE,
        limit: 100,
        offset: 50,
      };

      const result = ListLotBatchRequestSchema.parse(validRequest);
      expect(result.agencyId).toBe('550e8400-e29b-41d4-a716-446655440003');
      expect(result.status).toBe(LotStatus.ACTIVE);
    });

    it('should apply default values for optional fields', () => {
      const minimalRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = ListLotBatchRequestSchema.parse(minimalRequest);
      expect(result.includeExpired).toBe(false);
      expect(result.includeInactive).toBe(false);
      expect(result.hasQuantityOnly).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('manufacturingDate');
      expect(result.sortOrder).toBe('ASC');
      expect(result.fifoOrder).toBe(true);
    });

    it('should reject request without productId or agencyId', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        limit: 50,
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        requestedBy: 'invalid-uuid',
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid limit values', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        limit: 0, // Invalid - must be at least 1
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject limit exceeding maximum', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        limit: 1001, // Invalid - exceeds maximum of 1000
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject negative offset values', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        offset: -1, // Invalid - cannot be negative
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid sortBy values', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        sortBy: 'invalidField', // Invalid sort field
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid sortOrder values', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        sortOrder: 'INVALID', // Invalid sort order
      };

      expect(() => ListLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleListLotBatches Method', () => {
    const validListRequest = {
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

    const mockLotBatchItems = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        lotBatchCode: 'LOT001-BATCH001',
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        remainingQuantity: 800,
        availableQuantity: 700,
        status: LotStatus.ACTIVE,
        isExpired: false,
        isNearExpiry: false,
        daysUntilExpiry: 330,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        displayText: 'LOT001-BATCH001 (800 units) - Expires 2024-12-31',
        sortKey: '2024-01-01_LOT001_BATCH001',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        lotNumber: 'LOT002',
        batchNumber: null,
        lotBatchCode: 'LOT002',
        manufacturingDate: new Date('2024-01-02'),
        expiryDate: new Date('2024-11-30'),
        remainingQuantity: 500,
        availableQuantity: 500,
        status: LotStatus.ACTIVE,
        isExpired: false,
        isNearExpiry: true,
        daysUntilExpiry: 300,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        displayText: 'LOT002 (500 units) - Expires in 300 days',
        sortKey: '2024-01-02_LOT002_',
      },
    ];

    it('should list lot/batches successfully with valid request', async () => {
      // Arrange
      const mockListResult = {
        success: true,
        lotBatches: mockLotBatchItems,
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE'],
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, validListRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatches).toEqual(mockLotBatchItems);
      expect(result.data?.total).toBe(2);
      expect(result.data?.limit).toBe(50);
      expect(result.data?.offset).toBe(0);
      expect(result.data?.hasMore).toBe(false);
      expect(result.data?.filters.productId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(result.data?.sorting.fifoOrder).toBe(true);
      expect(result.operation).toBe('list-lot-batches');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const paginatedRequest = {
        ...validListRequest,
        limit: 10,
        offset: 20,
      };

      const mockListResult = {
        success: true,
        lotBatches: [mockLotBatchItems[0]], // Only one item returned
        total: 25,
        limit: 10,
        offset: 20,
        hasMore: false, // 20 + 1 < 25, so no more pages
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE'],
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, paginatedRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(25);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.offset).toBe(20);
      expect(result.data?.hasMore).toBe(false);
      expect(mockListHandler.handle).toHaveBeenCalledWith({
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: undefined,
        status: undefined,
        includeExpired: false,
        includeInactive: false,
        hasQuantityOnly: true,
        limit: 10,
        offset: 20,
        sortBy: 'manufacturingDate',
        sortOrder: 'ASC',
        fifoOrder: true,
      });
    });

    it('should handle filtering by status array', async () => {
      // Arrange
      const filteredRequest = {
        ...validListRequest,
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        includeInactive: true,
      };

      const mockListResult = {
        success: true,
        lotBatches: mockLotBatchItems,
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE', 'QUARANTINE'],
          includeExpired: false,
          includeInactive: true,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, filteredRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.filters.statusFilter).toEqual(['ACTIVE', 'QUARANTINE']);
      expect(result.data?.filters.includeInactive).toBe(true);
    });

    it('should handle sorting options correctly', async () => {
      // Arrange
      const sortedRequest = {
        ...validListRequest,
        sortBy: 'expiryDate',
        sortOrder: 'DESC',
        fifoOrder: false,
      };

      const mockListResult = {
        success: true,
        lotBatches: mockLotBatchItems.reverse(), // Reverse order for DESC sort
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE'],
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'expiryDate',
          sortOrder: 'DESC',
          fifoOrder: false,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, sortedRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.sorting.sortBy).toBe('expiryDate');
      expect(result.data?.sorting.sortOrder).toBe('DESC');
      expect(result.data?.sorting.fifoOrder).toBe(false);
    });

    it('should return error when no lots found', async () => {
      // Arrange
      const mockListResult = {
        success: false,
        error: 'No lot/batches found matching the specified criteria',
        lotBatches: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE'],
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, validListRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No lot/batches found matching the specified criteria');
    });

    it('should handle request validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        requestedBy: 'invalid-uuid',
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };

      // Act
      const result = await (handler as any).handleListLotBatches({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle unexpected handler errors gracefully', async () => {
      // Arrange
      const mockListHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Database query timeout')),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, validListRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database query timeout');
    });

    it('should handle empty result set correctly', async () => {
      // Arrange
      const mockListResult = {
        success: true,
        lotBatches: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          statusFilter: ['ACTIVE'],
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
        },
        sorting: {
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        },
      };

      const mockListHandler = {
        handle: jest.fn().mockResolvedValue(mockListResult),
      };
      (handler as any).listLotBatchesHandler = mockListHandler;

      // Act
      const result = await (handler as any).handleListLotBatches({}, validListRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatches).toEqual([]);
      expect(result.data?.total).toBe(0);
      expect(result.data?.hasMore).toBe(false);
    });
  });

  describe('SearchLotBatch IPC Request Schema Validation', () => {
    it('should validate valid search request with text search', () => {
      const validRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        searchTerm: 'test lot',
        productId: ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007'],
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        isActive: true,
        hasQuantity: true,
        minQuantity: 10,
        maxQuantity: 1000,
        limit: 50,
        offset: 0,
        sortBy: 'lotNumber',
        sortOrder: 'ASC',
        fifoOrder: false,
      };

      const result = SearchLotBatchRequestSchema.parse(validRequest);
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440004');
      expect(result.searchTerm).toBe('test lot');
      expect(result.productId).toEqual([
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440007',
      ]);
      expect(result.status).toEqual([LotStatus.ACTIVE, LotStatus.QUARANTINE]);
      expect(result.isActive).toBe(true);
      expect(result.hasQuantity).toBe(true);
      expect(result.minQuantity).toBe(10);
      expect(result.maxQuantity).toBe(1000);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe('lotNumber');
      expect(result.fifoOrder).toBe(false);
    });

    it('should validate search request with date ranges', () => {
      const validRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        manufacturingDateAfter: '2024-01-01T00:00:00.000Z',
        manufacturingDateBefore: '2024-12-31T23:59:59.999Z',
        expiryDateAfter: '2024-06-01T00:00:00.000Z',
        expiryDateBefore: '2025-12-31T23:59:59.999Z',
        expiringWithinDays: 90,
        nearExpiryDays: 30,
      };

      const result = SearchLotBatchRequestSchema.parse(validRequest);
      expect(result.agencyId).toBe('550e8400-e29b-41d4-a716-446655440003');
      expect(result.manufacturingDateAfter).toBeInstanceOf(Date);
      expect(result.manufacturingDateBefore).toBeInstanceOf(Date);
      expect(result.expiryDateAfter).toBeInstanceOf(Date);
      expect(result.expiryDateBefore).toBeInstanceOf(Date);
      expect(result.expiringWithinDays).toBe(90);
      expect(result.nearExpiryDays).toBe(30);
    });

    it('should apply default values for optional fields', () => {
      const minimalRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      const result = SearchLotBatchRequestSchema.parse(minimalRequest);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('manufacturingDate');
      expect(result.sortOrder).toBe('ASC');
      expect(result.fifoOrder).toBe(false);
      expect(result.nearExpiryDays).toBe(30);
    });

    it('should validate specific field searches', () => {
      const validRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        supplierLotCode: 'SUP001',
        supplierId: '550e8400-e29b-41d4-a716-446655440005',
      };

      const result = SearchLotBatchRequestSchema.parse(validRequest);
      expect(result.lotNumber).toBe('LOT001');
      expect(result.batchNumber).toBe('BATCH001');
      expect(result.supplierLotCode).toBe('SUP001');
      expect(result.supplierId).toBe('550e8400-e29b-41d4-a716-446655440005');
    });

    it('should reject invalid UUID formats', () => {
      const invalidRequest = {
        requestedBy: 'invalid-uuid',
        productId: '550e8400-e29b-41d4-a716-446655440002',
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject search term that is too long', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        searchTerm: 'a'.repeat(256), // Exceeds 255 character limit
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid date ranges', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        manufacturingDateAfter: '2024-12-31T00:00:00.000Z',
        manufacturingDateBefore: '2024-01-01T00:00:00.000Z', // Before comes before after
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid quantity ranges', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        minQuantity: 1000,
        maxQuantity: 100, // Max is less than min
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject negative quantities', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        minQuantity: -10, // Negative quantity
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid expiry days range', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        expiringWithinDays: 4000, // Exceeds 10 years limit
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid sort field', () => {
      const invalidRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        sortBy: 'invalidField', // Not in allowed enum
      };

      expect(() => SearchLotBatchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('handleSearchLotBatches Method', () => {
    const validSearchRequest = {
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      searchTerm: 'test',
      productId: '550e8400-e29b-41d4-a716-446655440002',
      status: LotStatus.ACTIVE,
      hasQuantity: true,
      limit: 100,
      offset: 0,
      sortBy: 'manufacturingDate',
      sortOrder: 'ASC',
      fifoOrder: false,
      nearExpiryDays: 30,
    };

    const mockSearchResults = [
      {
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
        isExpired: false,
        isNearExpiry: false,
        daysUntilExpiry: 330,
        createdBy: '550e8400-e29b-41d4-a716-446655440004',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedBy: '550e8400-e29b-41d4-a716-446655440004',
        updatedAt: new Date('2024-01-02T10:00:00Z'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        lotNumber: 'LOT002',
        batchNumber: null,
        manufacturingDate: new Date('2024-01-02'),
        expiryDate: new Date('2024-11-30'),
        quantity: 500,
        remainingQuantity: 400,
        reservedQuantity: 50,
        availableQuantity: 350,
        status: LotStatus.ACTIVE,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
        supplierId: null,
        supplierLotCode: null,
        isExpired: false,
        isNearExpiry: true,
        daysUntilExpiry: 300,
        createdBy: '550e8400-e29b-41d4-a716-446655440004',
        createdAt: new Date('2024-01-02T10:00:00Z'),
        updatedBy: null,
        updatedAt: null,
      },
    ];

    it('should search lot/batches successfully with valid request', async () => {
      // Arrange
      const mockSearchResult = {
        success: true,
        lotBatches: mockSearchResults,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: ['Search: "test"', 'Product ID(s): 1 selected', 'Status: ACTIVE', 'With remaining quantity'],
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, validSearchRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatches).toEqual(mockSearchResults);
      expect(result.data?.total).toBe(2);
      expect(result.data?.limit).toBe(100);
      expect(result.data?.offset).toBe(0);
      expect(result.data?.hasMore).toBe(false);
      expect(result.data?.searchCriteria.appliedFilters).toEqual([
        'Search: "test"',
        'Product ID(s): 1 selected',
        'Status: ACTIVE',
        'With remaining quantity',
      ]);
      expect(result.operation).toBe('search-lot-batches');
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should handle advanced search with multiple filters', async () => {
      // Arrange
      const advancedRequest = {
        ...validSearchRequest,
        agencyId: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440008'],
        lotNumber: 'LOT',
        minQuantity: 100,
        maxQuantity: 1000,
        manufacturingDateAfter: new Date('2024-01-01'),
        manufacturingDateBefore: new Date('2024-12-31'),
        isExpired: false,
        expiringWithinDays: 90,
      };

      const mockSearchResult = {
        success: true,
        lotBatches: [mockSearchResults[0]], // Only one result for advanced search
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: [
            'Search: "test"',
            'Product ID(s): 1 selected',
            'Agency ID(s): 2 selected',
            'Lot Number: "LOT"',
            'Status: ACTIVE',
            'Min quantity: 100',
            'Max quantity: 1000',
            'Manufacturing after: 2024-01-01',
            'Manufacturing before: 2024-12-31',
            'Expiring within 90 days',
          ],
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, advancedRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(1);
      expect(result.data?.searchCriteria.appliedFilters).toContain('Agency ID(s): 2 selected');
      expect(result.data?.searchCriteria.appliedFilters).toContain('Min quantity: 100');
      expect(result.data?.searchCriteria.appliedFilters).toContain('Expiring within 90 days');
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const paginatedRequest = {
        ...validSearchRequest,
        limit: 10,
        offset: 20,
      };

      const mockSearchResult = {
        success: true,
        lotBatches: [mockSearchResults[0]], // Only one item for this page
        total: 35,
        limit: 10,
        offset: 20,
        hasMore: true, // More results available
        searchCriteria: {
          appliedFilters: ['Search: "test"', 'Product ID(s): 1 selected', 'Status: ACTIVE'],
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, paginatedRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(35);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.offset).toBe(20);
      expect(result.data?.hasMore).toBe(true);
    });

    it('should handle FIFO ordering correctly', async () => {
      // Arrange
      const fifoRequest = {
        ...validSearchRequest,
        sortBy: 'expiryDate',
        sortOrder: 'DESC',
        fifoOrder: true, // Should override sortBy and sortOrder
      };

      const mockSearchResult = {
        success: true,
        lotBatches: mockSearchResults,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: ['Search: "test"', 'Product ID(s): 1 selected', 'Status: ACTIVE'],
          sortBy: 'manufacturingDate', // Should be overridden by FIFO
          sortOrder: 'ASC', // Should be overridden by FIFO
          fifoOrder: true,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, fifoRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.searchCriteria.fifoOrder).toBe(true);
      expect(result.data?.searchCriteria.sortBy).toBe('manufacturingDate');
      expect(result.data?.searchCriteria.sortOrder).toBe('ASC');
    });

    it('should return error when no results found', async () => {
      // Arrange
      const mockSearchResult = {
        success: false,
        error: 'No lot/batches found matching the search criteria',
        lotBatches: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: ['Search: "nonexistent"'],
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches(
        {},
        {
          ...validSearchRequest,
          searchTerm: 'nonexistent',
        }
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No lot/batches found matching the search criteria');
    });

    it('should handle request validation errors gracefully', async () => {
      // Arrange
      const invalidRequest = {
        requestedBy: 'invalid-uuid',
        searchTerm: 'test',
      };

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle unexpected handler errors gracefully', async () => {
      // Arrange
      const mockSearchHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Database connection timeout')),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, validSearchRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection timeout');
    });

    it('should handle empty search results correctly', async () => {
      // Arrange
      const mockSearchResult = {
        success: true,
        lotBatches: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: ['Search: "test"'],
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, validSearchRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.lotBatches).toEqual([]);
      expect(result.data?.total).toBe(0);
      expect(result.data?.hasMore).toBe(false);
    });

    it('should handle complex search criteria correctly', async () => {
      // Arrange
      const complexRequest = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
        searchTerm: 'premium',
        productId: ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007'],
        supplierId: '550e8400-e29b-41d4-a716-446655440005',
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        isAvailable: true,
        hasQuantity: true,
        hasReservedQuantity: false,
        minQuantity: 50,
        expiringWithinDays: 180,
        sortBy: 'expiryDate',
        sortOrder: 'ASC',
      };

      const mockSearchResult = {
        success: true,
        lotBatches: mockSearchResults,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
        searchCriteria: {
          appliedFilters: [
            'Search: "premium"',
            'Product ID(s): 2 selected',
            'Supplier ID(s): 1 selected',
            'Status: ACTIVE, QUARANTINE',
            'Available lots only',
            'With remaining quantity',
            'Min quantity: 50',
            'Expiring within 180 days',
          ],
          sortBy: 'expiryDate',
          sortOrder: 'ASC',
          fifoOrder: false,
        },
      };

      const mockSearchHandler = {
        handle: jest.fn().mockResolvedValue(mockSearchResult),
      };
      (handler as any).searchLotBatchesHandler = mockSearchHandler;

      // Act
      const result = await (handler as any).handleSearchLotBatches({}, complexRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.searchCriteria.appliedFilters).toContain('Search: "premium"');
      expect(result.data?.searchCriteria.appliedFilters).toContain('Product ID(s): 2 selected');
      expect(result.data?.searchCriteria.appliedFilters).toContain('Status: ACTIVE, QUARANTINE');
      expect(result.data?.searchCriteria.appliedFilters).toContain('Expiring within 180 days');
      expect(result.data?.searchCriteria.sortBy).toBe('expiryDate');
    });
  });

  describe('Handler Statistics', () => {
    it('should return correct statistics', () => {
      const stats = handler.getStats();
      expect(stats.allowedChannels).toBe(6); // Total allowed channels
      expect(stats.registeredChannels).toBe(0); // None registered yet in test
    });
  });

  describe('Error Handling', () => {
    it('should sanitize error messages for safe display', () => {
      const sensitiveMessage = 'Database error at /path/to/database.db with user@example.com and IP 192.168.1.1';
      const sanitized = (handler as any).getSafeErrorMessage(sensitiveMessage);

      expect(sanitized).not.toContain('/path/to/database.db');
      expect(sanitized).not.toContain('user@example.com');
      expect(sanitized).not.toContain('192.168.1.1');
      expect(sanitized).toContain('[IP]');
      expect(sanitized).toContain('[EMAIL]');
    });

    it('should handle empty error messages', () => {
      const sanitized = (handler as any).getSafeErrorMessage('');
      expect(sanitized).toBe('An error occurred during processing');
    });
  });
});
