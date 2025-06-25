/**
 * Create Order Handler - Lot/Batch Integration Tests
 * Step 2.3: Complete Lot/Batch Integration
 *
 * Tests lot allocation tracking in order items during order creation
 * Following TDD approach and Instructions file standards
 *
 * @testType Integration
 * @phase Order Repository Phase 2 Completion
 * @step 2.3
 */

import { CreateOrderHandler } from '../create-order.handler';
import type { CreateOrderHandlerDependencies } from '../create-order.handler';
import { Money } from '../../../../domain/value-objects/money';
import { PaymentMethod } from '../../../../domain/entities/order';

// Test Framework Setup
describe('CreateOrderHandler - Lot/Batch Integration', () => {
  let handler: CreateOrderHandler;
  let mockDeps: jest.Mocked<CreateOrderHandlerDependencies>;
  let mockLotBatchTransaction: any;

  const testAgencyId = '12345678-1234-1234-1234-123456789abc';
  const testUserId = '12345678-1234-1234-1234-123456789abc';
  const testProductId = '12345678-1234-1234-1234-123456789abc';
  const testCustomerId = '12345678-1234-1234-1234-123456789abc';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock lot/batch transaction
    mockLotBatchTransaction = {
      reserveQuantity: jest.fn(),
      releaseReservedQuantity: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
    };

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
    };

    handler = new CreateOrderHandler(mockDeps);
  });

  describe('Step 2.3a: Lot Allocation Framework', () => {
    it('should validate framework is ready for lot integration testing', async () => {
      // Act & Assert - Framework validation
      expect(handler).toBeDefined();
      expect(mockDeps.lotBatchRepository.selectFifoLots).toBeDefined();
      expect(mockLotBatchTransaction.reserveQuantity).toBeDefined();
    });

    it('should have access to FIFO lot selection methods', async () => {
      // Act
      const fifoMock = mockDeps.lotBatchRepository.selectFifoLots;

      // Assert
      expect(typeof fifoMock).toBe('function');
      expect(fifoMock).toBeDefined();
    });
  });

  describe('Step 2.3b: Lot Allocation Tracking', () => {
    it('should track lot allocations in order items during creation', async () => {
      // Arrange - Use working command structure
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-LOT-001',
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
            quantityBoxes: 3, // 30 units total
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

      // Mock FIFO selection with multiple lots
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
            allocatedQuantity: 20,
          },
          {
            lotBatch: {
              id: 'lot-002',
              lotNumber: 'LOT-002',
              batchNumber: 'BATCH-002',
              manufacturingDate: new Date('2024-01-05'),
              expiryDate: new Date('2024-12-31'),
            },
            allocatedQuantity: 15,
          },
        ],
        totalAllocatedQuantity: 35,
        remainingQuantity: 0,
        hasFullAllocation: true,
      });

      // Mock successful save and capture the saved order
      let savedOrder: any;
      (mockDeps.orderRepository.save as jest.Mock).mockImplementation((order) => {
        savedOrder = order;
        return Promise.resolve({
          id: 'order-001',
          orderNumber: 'ORD-LOT-001',
          totalAmount: Money.fromDecimal(3850, 'USD'),
          agencyId: testAgencyId,
          items: order.items, // Include items in response
        });
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert
      expect(result.success).toBe(true);

      // Verify FIFO selection was called
      expect(mockDeps.lotBatchRepository.selectFifoLots).toHaveBeenCalledWith({
        productId: testProductId,
        agencyId: testAgencyId,
        requestedQuantity: 35, // 3 boxes * 10 + 5 loose
        excludeStatuses: ['EXPIRED', 'DAMAGED', 'RECALLED'],
        includeReserved: false,
      });

      // Verify reservations were made
      expect(mockLotBatchTransaction.reserveQuantity).toHaveBeenCalledWith('lot-001', 20, testUserId);
      expect(mockLotBatchTransaction.reserveQuantity).toHaveBeenCalledWith('lot-002', 15, testUserId);
      expect(mockLotBatchTransaction.commit).toHaveBeenCalledTimes(1);

      // Verify order was saved with lot allocation data
      expect(mockDeps.orderRepository.save).toHaveBeenCalledTimes(1);

      // Step 2.3: Verify lot allocations are tracked in the saved order
      expect(savedOrder).toBeDefined();
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].lotAllocations).toHaveLength(2);

      // Verify first lot allocation
      const firstLot = savedOrder.items[0].lotAllocations[0];
      expect(firstLot.lotBatchId).toBe('lot-001');
      expect(firstLot.lotNumber).toBe('LOT-001');
      expect(firstLot.batchNumber).toBe('BATCH-001');
      expect(firstLot.allocatedQuantity).toBe(20);
      expect(firstLot.reservedBy).toBe(testUserId);
      expect(firstLot.manufacturingDate).toEqual(new Date('2024-01-01'));
      expect(firstLot.expiryDate).toEqual(new Date('2024-12-31'));

      // Verify second lot allocation
      const secondLot = savedOrder.items[0].lotAllocations[1];
      expect(secondLot.lotBatchId).toBe('lot-002');
      expect(secondLot.lotNumber).toBe('LOT-002');
      expect(secondLot.batchNumber).toBe('BATCH-002');
      expect(secondLot.allocatedQuantity).toBe(15);
      expect(secondLot.reservedBy).toBe(testUserId);
      expect(secondLot.manufacturingDate).toEqual(new Date('2024-01-05'));
      expect(secondLot.expiryDate).toEqual(new Date('2024-12-31'));

      // Verify total allocated quantity matches order item quantity
      const totalAllocated = savedOrder.items[0].lotAllocations.reduce(
        (sum: number, allocation: any) => sum + allocation.allocatedQuantity,
        0
      );
      expect(totalAllocated).toBe(35); // Should match total units requested
    });

    it('should handle single lot allocation correctly', async () => {
      // Arrange
      const validCommand = {
        agencyId: testAgencyId,
        customerId: testCustomerId,
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-SINGLE-LOT-001',
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
            quantityBoxes: 1, // 10 units total
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

      // Mock FIFO selection with single lot
      (mockDeps.lotBatchRepository.selectFifoLots as jest.Mock).mockResolvedValue({
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-single',
              lotNumber: 'LOT-SINGLE',
              batchNumber: 'BATCH-SINGLE',
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

      // Mock successful save
      (mockDeps.orderRepository.save as jest.Mock).mockResolvedValue({
        id: 'order-single',
        orderNumber: 'ORD-SINGLE-LOT-001',
        totalAmount: Money.fromDecimal(1100, 'USD'),
        agencyId: testAgencyId,
      });

      // Act
      const result = await handler.execute(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(mockLotBatchTransaction.reserveQuantity).toHaveBeenCalledWith('lot-single', 10, testUserId);
      expect(mockLotBatchTransaction.reserveQuantity).toHaveBeenCalledTimes(1);
      expect(mockLotBatchTransaction.commit).toHaveBeenCalledTimes(1);
    });
  });
});
