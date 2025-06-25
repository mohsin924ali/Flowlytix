/**
 * Create Order Handler Enhancement Tests - Step 2: Lot Allocation Persistence
 *
 * Tests the enhanced order creation handler with lot allocation persistence.
 * Focuses on the integration between order creation and lot allocation tracking.
 * Following strict incremental approach with comprehensive testing coverage.
 *
 * @testType Unit + Integration
 * @phase Phase 3: Order Repository Implementation
 * @step Step 2: Order Handler Enhancement
 * @version 1.0.0
 */

import { CreateOrderHandler } from '../create-order.handler';
import type { CreateOrderHandlerDependencies } from '../create-order.handler';
import { Money } from '../../../../domain/value-objects/money';
import { PaymentMethod } from '../../../../domain/entities/order';
import {
  IOrderLotAllocationRepository,
  OrderLotAllocationRepositoryError,
} from '../../../../domain/repositories/order-lot-allocation.repository';

describe('CreateOrderHandler - Step 2: Lot Allocation Persistence Enhancement', () => {
  let handler: CreateOrderHandler;
  let mockDeps: jest.Mocked<CreateOrderHandlerDependencies>;
  let mockLotBatchTransaction: any;
  let mockOrderLotAllocationRepo: jest.Mocked<IOrderLotAllocationRepository>;

  const testAgencyId = '12345678-1234-1234-1234-123456789abc';
  const testUserId = '12345678-1234-1234-1234-123456789abc';
  const testProductId = '12345678-1234-1234-1234-123456789abc';
  const testCustomerId = '12345678-1234-1234-1234-123456789abc';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Mock lot/batch transaction
    mockLotBatchTransaction = {
      reserveQuantity: jest.fn(),
      releaseReservedQuantity: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
    };

    // Mock order lot allocation repository
    mockOrderLotAllocationRepo = {
      save: jest.fn(),
      saveBatch: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByOrderId: jest.fn(),
      findByOrderItemId: jest.fn(),
      findByLotBatchId: jest.fn(),
      findByLotNumber: jest.fn(),
      findWithExpiringLots: jest.fn(),
      findByReservedBy: jest.fn(),
      search: jest.fn(),
      existsByOrderItemAndLot: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      delete: jest.fn(),
      deleteByOrderId: jest.fn(),
      deleteByOrderItemId: jest.fn(),
      getStats: jest.fn(),
      isHealthy: jest.fn(),
    } as any;

    // Mock dependencies
    mockDeps = {
      orderRepository: {
        save: jest.fn(),
        existsByOrderNumber: jest.fn().mockResolvedValue(false),
        getNextOrderNumber: jest.fn().mockResolvedValue('ORD-001'),
      } as any,
      customerRepository: {
        findById: jest.fn(),
      } as any,
      productRepository: {
        findById: jest.fn(),
      } as any,
      lotBatchRepository: {
        getAvailableQuantityForProduct: jest.fn().mockResolvedValue(1000),
        beginTransaction: jest.fn().mockResolvedValue(mockLotBatchTransaction),
        selectFifoLots: jest.fn(),
      } as any,
      orderLotAllocationRepository: mockOrderLotAllocationRepo,
    };

    handler = new CreateOrderHandler(mockDeps);
  });

  describe('Step 2.1: Dependency Integration', () => {
    it('should have order lot allocation repository dependency', () => {
      // Assert
      expect(handler).toBeDefined();
      expect(mockDeps.orderLotAllocationRepository).toBeDefined();
      expect(typeof mockDeps.orderLotAllocationRepository.save).toBe('function');
    });

    it('should have required repository methods available', () => {
      // Assert
      expect(mockDeps.orderLotAllocationRepository.save).toBeDefined();
      expect(mockDeps.orderLotAllocationRepository.findByOrderId).toBeDefined();
      expect(mockDeps.orderLotAllocationRepository.existsByOrderItemAndLot).toBeDefined();
    });
  });

  describe('Step 2.2: Lot Allocation Persistence Flow', () => {
    it('should save lot allocations after order creation successfully', async () => {
      // Arrange - Valid order command
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-PERSIST-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 2, // 20 units total
            quantityLoose: 5,
          },
        ],
      };

      // Mock customer
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      // Mock product
      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      // Mock FIFO selection with single lot
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-001',
              lotNumber: 'LOT-001',
              batchNumber: 'BATCH-001',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 25,
          },
        ],
        totalAllocatedQuantity: 25,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      // Mock successful order save and capture saved order
      let savedOrder: any;
      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => {
        savedOrder = {
          id: 'order-001',
          orderNumber: 'ORD-PERSIST-001',
          totalAmount: Money.fromDecimal(2750, 'USD'),
          agencyId: testAgencyId,
          items: order.items,
        };
        return Promise.resolve(savedOrder);
      });

      // Mock successful lot allocation saves
      mockOrderLotAllocationRepo.save.mockResolvedValue({
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 25,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Order creation success
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-001');

      // Assert - Order was saved
      expect(mockDeps.orderRepository.save).toHaveBeenCalledTimes(1);

      // Assert - Lot allocation was saved
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledTimes(1);
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledWith({
        orderId: 'order-001',
        orderItemId: expect.any(String),
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 25,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });

      // Assert - Transaction was committed
      expect(mockLotBatchTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should save multiple lot allocations for multiple order items', async () => {
      // Arrange - Order with multiple items
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-MULTI-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product 1',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 0,
          },
          {
            productId: 'product-002',
            productCode: 'PROD002',
            productName: 'Test Product 2',
            unitPrice: 200,
            boxSize: 5,
            quantityBoxes: 1,
            quantityLoose: 2,
          },
        ],
      };

      // Mock customer
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      // Mock products
      (mockDeps.productRepository.findById as jest.Mock)
        .mockResolvedValueOnce({
          id: testProductId,
          sku: 'PROD001',
          status: 'ACTIVE',
          sellingPrice: Money.fromDecimal(100, 'USD'),
        })
        .mockResolvedValueOnce({
          id: 'product-002',
          sku: 'PROD002',
          status: 'ACTIVE',
          sellingPrice: Money.fromDecimal(200, 'USD'),
        });

      // Mock FIFO selection for both products
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock)
        .mockResolvedValueOnce({
          selectedLots: [
            {
              lotBatch: {
                id: 'lot-001',
                lotNumber: 'LOT-001',
                batchNumber: 'BATCH-001',
                manufacturingDate: new Date('2024-01-01'),
                expiryDate: new Date('2024-12-31'),
              },
              allocatedQuantity: 10,
            },
          ],
          totalAllocatedQuantity: 10,
          remainingQuantity: 0,
          hasFullAllocation: true,
        })
        .mockResolvedValueOnce({
          selectedLots: [
            {
              lotBatch: {
                id: 'lot-002',
                lotNumber: 'LOT-002',
                batchNumber: 'BATCH-002',
                manufacturingDate: new Date('2024-01-02'),
                expiryDate: new Date('2024-12-31'),
              },
              allocatedQuantity: 7,
            },
          ],
          totalAllocatedQuantity: 7,
          remainingQuantity: 0,
          hasFullAllocation: true,
        });

      // Mock successful order save
      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => ({
        id: 'order-002',
        orderNumber: 'ORD-MULTI-001',
        totalAmount: Money.fromDecimal(2400, 'USD'),
        agencyId: testAgencyId,
        items: order.items,
      }));

      // Mock successful lot allocation saves
      mockOrderLotAllocationRepo.save.mockResolvedValue({
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 10,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Order creation success
      expect(result.success).toBe(true);

      // Assert - Two lot allocations were saved (one per item)
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledTimes(2);

      // Assert - First allocation (Product 1)
      expect(mockOrderLotAllocationRepo.save).toHaveBeenNthCalledWith(1, {
        orderId: 'order-002',
        orderItemId: expect.any(String),
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 10,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });

      // Assert - Second allocation (Product 2)
      expect(mockOrderLotAllocationRepo.save).toHaveBeenNthCalledWith(2, {
        orderId: 'order-002',
        orderItemId: expect.any(String),
        lotBatchId: 'lot-002',
        lotNumber: 'LOT-002',
        batchNumber: 'BATCH-002',
        allocatedQuantity: 7,
        manufacturingDate: new Date('2024-01-02'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });
    });

    it('should save multiple lot allocations for single order item with split lots', async () => {
      // Arrange - Order requiring split lots
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-SPLIT-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 5, // 50 units total - will require multiple lots
            quantityLoose: 0,
          },
        ],
      };

      // Mock customer
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      // Mock product
      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      // Mock FIFO selection with split lots
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-001',
              lotNumber: 'LOT-001',
              batchNumber: 'BATCH-001',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 30,
          },
          {
            lotBatch: {
              id: 'lot-002',
              lotNumber: 'LOT-002',
              batchNumber: 'BATCH-002',
              manufacturingDate: new Date('2024-01-05'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 20,
          },
        ],
        totalAllocatedQuantity: 50,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      // Mock successful order save
      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => ({
        id: 'order-003',
        orderNumber: 'ORD-SPLIT-001',
        totalAmount: Money.fromDecimal(5500, 'USD'),
        agencyId: testAgencyId,
        items: order.items,
      }));

      // Mock successful lot allocation saves
      mockOrderLotAllocationRepo.save
        .mockResolvedValueOnce({
          lotBatchId: 'lot-001',
          lotNumber: 'LOT-001',
          batchNumber: 'BATCH-001',
          allocatedQuantity: 30,
          manufacturingDate: new Date('2024-01-01'),
          expiryDate: new Date('2024-12-31'),
          reservedAt: expect.any(Date),
          reservedBy: testUserId,
        })
        .mockResolvedValueOnce({
          lotBatchId: 'lot-002',
          lotNumber: 'LOT-002',
          batchNumber: 'BATCH-002',
          allocatedQuantity: 20,
          manufacturingDate: new Date('2024-01-05'),
          expiryDate: new Date('2024-12-31'),
          reservedAt: expect.any(Date),
          reservedBy: testUserId,
        });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Order creation success
      expect(result.success).toBe(true);

      // Assert - Two lot allocations were saved for the single item
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledTimes(2);

      // Assert - First allocation
      expect(mockOrderLotAllocationRepo.save).toHaveBeenNthCalledWith(1, {
        orderId: 'order-003',
        orderItemId: expect.any(String),
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 30,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });

      // Assert - Second allocation
      expect(mockOrderLotAllocationRepo.save).toHaveBeenNthCalledWith(2, {
        orderId: 'order-003',
        orderItemId: expect.any(String),
        lotBatchId: 'lot-002',
        lotNumber: 'LOT-002',
        batchNumber: 'BATCH-002',
        allocatedQuantity: 20,
        manufacturingDate: new Date('2024-01-05'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });
    });
  });

  describe('Step 2.3: Error Handling and Rollback', () => {
    it('should rollback transaction when lot allocation save fails', async () => {
      // Arrange - Valid order command
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-FAIL-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 0,
          },
        ],
      };

      // Mock customer and product
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      // Mock FIFO selection
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-001',
              lotNumber: 'LOT-001',
              batchNumber: 'BATCH-001',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 10,
          },
        ],
        totalAllocatedQuantity: 10,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      // Mock successful order save - capture actual items with generated IDs
      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => ({
        id: 'order-004',
        orderNumber: 'ORD-FAIL-001',
        totalAmount: Money.fromDecimal(1100, 'USD'),
        agencyId: testAgencyId,
        items: order.items, // Use actual items with generated IDs
      }));

      // Mock lot allocation save failure - override behavior for this test
      mockOrderLotAllocationRepo.save.mockImplementation(() => {
        throw new OrderLotAllocationRepositoryError('Database connection failed', 'save');
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Order creation failed
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save lot allocation tracking data');

      // Assert - Order was saved (but transaction rolled back)
      expect(mockDeps.orderRepository.save).toHaveBeenCalledTimes(1);

      // Assert - Lot allocation save was attempted
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledTimes(1);

      // Assert - Transaction was rolled back
      expect(mockLotBatchTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockLotBatchTransaction.commit).not.toHaveBeenCalled();
    });

    it('should handle lot allocation repository connectivity issues', async () => {
      // Arrange - Valid command setup (shortened for error testing)
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-CONN-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 0,
          },
        ],
      };

      // Mock dependencies (basic setup)
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-001',
              lotNumber: 'LOT-001',
              batchNumber: 'BATCH-001',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 10,
          },
        ],
        totalAllocatedQuantity: 10,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => ({
        id: 'order-005',
        orderNumber: 'ORD-CONN-001',
        totalAmount: Money.fromDecimal(1100, 'USD'),
        agencyId: testAgencyId,
        items: order.items, // Use actual items with generated IDs
      }));

      // Mock connection failure - override behavior for this test
      mockOrderLotAllocationRepo.save.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save lot allocation tracking data');
      expect(result.error).toContain('Connection timeout');

      // Assert - Transaction rollback was attempted
      expect(mockLotBatchTransaction.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step 2.4: Edge Cases and Data Validation', () => {
    it('should handle order items with no lot allocations', async () => {
      // This test verifies behavior when itemLotAllocations map is empty
      // which shouldn't happen in normal flow but tests error resilience

      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-EMPTY-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 0,
          },
        ],
      };

      // Mock dependencies
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      // Mock FIFO with empty result (edge case)
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [],
        totalAllocatedQuantity: 0,
        remainingQuantity: 10,
        hasFullAllocation: false,
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Should fail due to insufficient allocation
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory for FIFO allocation');

      // Assert - No lot allocations should be saved
      expect(mockOrderLotAllocationRepo.save).not.toHaveBeenCalled();
    });

    it('should preserve lot allocation data integrity across the flow', async () => {
      // Arrange - Command with specific lot data to verify preservation
      const specificManufacturingDate = new Date('2024-01-10T08:30:00.000Z');
      const specificExpiryDate = new Date('2024-12-10T23:59:59.999Z');
      const specificReservedAt = new Date('2024-01-15T14:22:33.456Z');

      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-INTEGRITY-001',
        orderDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-25'),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: testUserId,
        items: [
          {
            productId: testProductId,
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 5,
          },
        ],
      };

      // Mock dependencies
      (mockDeps.customerRepository.findById as jest.Mock).mockResolvedValue({
        id: testCustomerId,
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: jest.fn().mockReturnValue(true),
      });

      (mockDeps.productRepository.findById as jest.Mock).mockResolvedValue({
        id: testProductId,
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      });

      // Mock FIFO with specific dates and data
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-specific-001',
              lotNumber: 'LOT-SPECIFIC-001',
              batchNumber: 'BATCH-SPECIFIC-001',
              manufacturingDate: specificManufacturingDate,
              expiryDate: specificExpiryDate,
            },
            allocatedQuantity: 15,
          },
        ],
        totalAllocatedQuantity: 15,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => ({
        id: 'order-integrity-001',
        orderNumber: 'ORD-INTEGRITY-001',
        totalAmount: Money.fromDecimal(1650, 'USD'),
        agencyId: testAgencyId,
        items: order.items, // Use actual items with generated IDs
      }));

      // Reset lot allocation repository mock to successful behavior
      mockOrderLotAllocationRepo.save.mockImplementation(() =>
        Promise.resolve({
          lotBatchId: 'lot-specific-001',
          lotNumber: 'LOT-SPECIFIC-001',
          batchNumber: 'BATCH-SPECIFIC-001',
          allocatedQuantity: 15,
          manufacturingDate: specificManufacturingDate,
          expiryDate: specificExpiryDate,
          reservedAt: expect.any(Date),
          reservedBy: testUserId,
        })
      );

      // Act
      const result = await handler.execute(validCommand);

      // Assert - Success
      expect(result.success).toBe(true);

      // Assert - Lot allocation called with exact data preservation
      expect(mockOrderLotAllocationRepo.save).toHaveBeenCalledWith({
        orderId: 'order-integrity-001',
        orderItemId: expect.any(String), // Use any string since ID is generated
        lotBatchId: 'lot-specific-001',
        lotNumber: 'LOT-SPECIFIC-001',
        batchNumber: 'BATCH-SPECIFIC-001',
        allocatedQuantity: 15,
        manufacturingDate: specificManufacturingDate,
        expiryDate: specificExpiryDate,
        reservedAt: expect.any(Date),
        reservedBy: testUserId,
      });
    });
  });
});
