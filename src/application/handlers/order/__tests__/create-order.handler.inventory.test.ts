/**
 * Create Order Handler - Inventory Integration Tests
 *
 * Phase 2 Completion: Testing inventory availability checking during order creation
 * Following Instructions file standards with incremental TDD approach
 *
 * @domain Order Management - Inventory Integration
 * @phase Phase 2 Completion
 * @version 1.0.0
 */

import { CreateOrderHandler, CreateOrderHandlerDependencies } from '../create-order.handler';
import { OrderRepository } from '../../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../../domain/repositories/product.repository';
import { ILotBatchRepository } from '../../../../domain/repositories/lot-batch.repository';
import { PaymentMethod } from '../../../../domain/entities/order';
import { Money } from '../../../../domain/value-objects/money';

describe('CreateOrderHandler - Inventory Integration', () => {
  let handler: CreateOrderHandler;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockCustomerRepository: jest.Mocked<ICustomerRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockLotBatchRepository: jest.Mocked<ILotBatchRepository>;
  let dependencies: CreateOrderHandlerDependencies;

  beforeEach(() => {
    // Create mocked repositories
    mockOrderRepository = {
      save: jest.fn(),
      existsByOrderNumber: jest.fn(),
      getNextOrderNumber: jest.fn(),
      beginTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
    } as any;

    mockCustomerRepository = {
      findById: jest.fn(),
    } as any;

    mockProductRepository = {
      findById: jest.fn(),
    } as any;

    mockLotBatchRepository = {
      getAvailableQuantityForProduct: jest.fn(),
      selectFifoLots: jest.fn(),
      beginTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      reserveLots: jest.fn(),
    } as any;

    dependencies = {
      orderRepository: mockOrderRepository,
      customerRepository: mockCustomerRepository,
      productRepository: mockProductRepository,
      lotBatchRepository: mockLotBatchRepository,
    };

    handler = new CreateOrderHandler(dependencies);
  });

  describe('Step 2.1: Basic Framework Setup', () => {
    it('should validate test framework is ready for inventory integration', () => {
      // Framework validation test - ensuring we can extend the handler
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(CreateOrderHandler);
    });

    it('should have access to lot/batch repository', () => {
      expect(dependencies.lotBatchRepository).toBeDefined();
      expect(mockLotBatchRepository.getAvailableQuantityForProduct).toBeDefined();
    });
  });

  describe('Step 2.2: Inventory Availability Validation', () => {
    const mockCustomer = {
      id: 'customer-123',
      customerCode: 'CUST001',
      status: 'ACTIVE',
      creditLimit: Money.fromDecimal(10000, 'USD'),
      canPlaceOrders: () => true,
    };

    const mockProduct = {
      id: 'product-123',
      sku: 'PROD001',
      status: 'ACTIVE',
      sellingPrice: Money.fromDecimal(100, 'USD'),
    };

    const validOrderCommand = {
      agencyId: '12345678-1234-1234-1234-123456789abc',
      customerId: '12345678-1234-1234-1234-123456789abc',
      customerCode: 'CUST001',
      customerName: 'Test Customer Ltd',
      customerCreditLimit: 10000,
      customerBalance: 2000,
      orderNumber: 'ORD-001',
      orderDate: new Date('2024-01-15'),
      dueDate: new Date('2024-01-25'),
      areaCode: 'AREA001',
      areaName: 'Test Area',
      workerName: 'Test Worker',
      paymentMethod: 'CREDIT',
      requestedBy: '12345678-1234-1234-1234-123456789abc',
      items: [
        {
          productId: '12345678-1234-1234-1234-123456789abc',
          productCode: 'PROD001',
          productName: 'Test Product',
          unitPrice: 100,
          boxSize: 10,
          quantityBoxes: 5, // 50 units total
          quantityLoose: 0,
        },
      ],
    };

    it('should successfully validate inventory when sufficient stock is available', async () => {
      // Setup mocks
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        isActive: jest.fn().mockReturnValue(true),
        reserveQuantity: jest.fn().mockResolvedValue(undefined),
        save: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        releaseReservedQuantity: jest.fn().mockResolvedValue(undefined),
        consumeQuantity: jest.fn().mockResolvedValue(undefined),
      } as any;

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockResolvedValue(100); // Sufficient stock
      mockLotBatchRepository.beginTransaction.mockResolvedValue(mockTransaction);
      mockLotBatchRepository.selectFifoLots.mockResolvedValue({
        hasFullAllocation: true,
        totalAllocatedQuantity: 50,
        remainingQuantity: 0,
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-123',
              lotNumber: 'LOT001',
              batchNumber: 'BATCH001',
              productId: '12345678-1234-1234-1234-123456789abc',
              agencyId: '12345678-1234-1234-1234-123456789abc',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
              availableQuantity: 100,
              reservedQuantity: 0,
              totalQuantity: 100,
            },
            allocatedQuantity: 50,
          },
        ],
      } as any);
      mockOrderRepository.existsByOrderNumber.mockResolvedValue(false);
      mockOrderRepository.save.mockResolvedValue({
        id: 'order-123',
        orderNumber: 'ORD-001',
        totalAmount: { decimalAmount: 5000 },
      } as any);

      // Execute
      const result = await handler.execute(validOrderCommand);

      // Debug: Log the actual error if test fails
      if (!result.success) {
        console.log('Actual error:', result.error);
        console.log('Validation errors:', result.validationErrors);
      }

      // Verify
      expect(result.success).toBe(true);
      expect(mockLotBatchRepository.getAvailableQuantityForProduct).toHaveBeenCalledWith(
        '12345678-1234-1234-1234-123456789abc',
        '12345678-1234-1234-1234-123456789abc'
      );
    });

    it('should reject order when insufficient inventory is available', async () => {
      // Setup mocks
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockResolvedValue(30); // Insufficient stock

      // Execute
      const result = await handler.execute(validOrderCommand);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory for product PROD001');
      expect(result.error).toContain('requested: 50, available: 30');
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should provide detailed error information for inventory shortages', async () => {
      // Setup mocks
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockResolvedValue(20);

      // Execute
      const result = await handler.execute(validOrderCommand);

      // Verify detailed error message
      expect(result.success).toBe(false);
      expect(result.error).toContain('shortage: 30'); // 50 requested - 20 available = 30 shortage
    });

    it('should handle exact inventory match successfully', async () => {
      // Setup mocks
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        isActive: jest.fn().mockReturnValue(true),
        reserveQuantity: jest.fn().mockResolvedValue(undefined),
        save: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        releaseReservedQuantity: jest.fn().mockResolvedValue(undefined),
        consumeQuantity: jest.fn().mockResolvedValue(undefined),
      } as any;

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockResolvedValue(50); // Exact match
      mockLotBatchRepository.beginTransaction.mockResolvedValue(mockTransaction);
      mockLotBatchRepository.selectFifoLots.mockResolvedValue({
        hasFullAllocation: true,
        totalAllocatedQuantity: 50,
        remainingQuantity: 0,
        selectedLots: [
          {
            lotBatch: {
              id: 'lot-exact',
              lotNumber: 'LOT001',
              batchNumber: 'BATCH001',
              productId: '12345678-1234-1234-1234-123456789abc',
              agencyId: '12345678-1234-1234-1234-123456789abc',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
            },
            allocatedQuantity: 50,
          },
        ],
      } as any);
      mockOrderRepository.existsByOrderNumber.mockResolvedValue(false);
      mockOrderRepository.save.mockResolvedValue({
        id: 'order-exact',
        orderNumber: 'ORD-001',
        totalAmount: { decimalAmount: 5000 },
      } as any);

      // Execute
      const result = await handler.execute(validOrderCommand);

      // Verify
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-exact');
    });

    it('should handle zero inventory gracefully', async () => {
      // Setup mocks
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockResolvedValue(0);

      // Execute
      const result = await handler.execute(validOrderCommand);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('available: 0');
    });
  });

  describe('Step 2.3: Multi-Product Inventory Validation', () => {
    const multiProductCommand = {
      agencyId: '12345678-1234-1234-1234-123456789abc',
      customerId: '12345678-1234-1234-1234-123456789abc',
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
      requestedBy: '12345678-1234-1234-1234-123456789abc',
      items: [
        {
          productId: '12345678-1234-1234-1234-123456789abc',
          productCode: 'PROD001',
          productName: 'Test Product 1',
          unitPrice: 100,
          boxSize: 10,
          quantityBoxes: 3, // 30 units
          quantityLoose: 5, // 35 units total
        },
        {
          productId: '12345678-1234-1234-1234-123456789def',
          productCode: 'PROD002',
          productName: 'Test Product 2',
          unitPrice: 200,
          boxSize: 5,
          quantityBoxes: 2, // 10 units
          quantityLoose: 3, // 13 units total
        },
      ],
    };

    it('should validate inventory for all products when sufficient stock', async () => {
      // Setup mocks
      const mockCustomer = {
        id: 'customer-123',
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: () => true,
      };
      const mockProduct1 = {
        id: 'product-1',
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      };
      const mockProduct2 = {
        id: 'product-2',
        sku: 'PROD002',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(200, 'USD'),
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        isActive: jest.fn().mockReturnValue(true),
        reserveQuantity: jest.fn().mockResolvedValue(undefined),
        save: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        releaseReservedQuantity: jest.fn().mockResolvedValue(undefined),
        consumeQuantity: jest.fn().mockResolvedValue(undefined),
      } as any;

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);
      mockLotBatchRepository.getAvailableQuantityForProduct
        .mockResolvedValueOnce(50) // Product 1: need 35, available 50
        .mockResolvedValueOnce(20); // Product 2: need 13, available 20
      mockLotBatchRepository.beginTransaction.mockResolvedValue(mockTransaction);
      mockLotBatchRepository.selectFifoLots
        .mockResolvedValueOnce({
          hasFullAllocation: true,
          totalAllocatedQuantity: 35,
          remainingQuantity: 0,
          selectedLots: [
            {
              lotBatch: {
                id: 'lot-1',
                lotNumber: 'LOT001',
                batchNumber: 'BATCH001',
                productId: '12345678-1234-1234-1234-123456789abc',
                agencyId: '12345678-1234-1234-1234-123456789abc',
                manufacturingDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-01-01'),
              },
              allocatedQuantity: 35,
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          hasFullAllocation: true,
          totalAllocatedQuantity: 13,
          remainingQuantity: 0,
          selectedLots: [
            {
              lotBatch: {
                id: 'lot-2',
                lotNumber: 'LOT002',
                batchNumber: 'BATCH002',
                productId: '12345678-1234-1234-1234-123456789def',
                agencyId: '12345678-1234-1234-1234-123456789abc',
                manufacturingDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-01-01'),
              },
              allocatedQuantity: 13,
            },
          ],
        } as any);
      mockOrderRepository.existsByOrderNumber.mockResolvedValue(false);
      mockOrderRepository.save.mockResolvedValue({
        id: 'order-multi',
        orderNumber: 'ORD-MULTI-001',
        totalAmount: { decimalAmount: 6100 },
      } as any);

      // Execute
      const result = await handler.execute(multiProductCommand);

      // Debug multi-product test
      if (!result.success) {
        console.log('Multi-product error:', result.error);
      }

      // Verify
      expect(result.success).toBe(true);
      expect(mockLotBatchRepository.getAvailableQuantityForProduct).toHaveBeenCalledTimes(2);
      expect(mockLotBatchRepository.getAvailableQuantityForProduct).toHaveBeenCalledWith(
        '12345678-1234-1234-1234-123456789abc',
        '12345678-1234-1234-1234-123456789abc'
      );
      expect(mockLotBatchRepository.getAvailableQuantityForProduct).toHaveBeenCalledWith(
        '12345678-1234-1234-1234-123456789def',
        '12345678-1234-1234-1234-123456789abc'
      );
    });

    it('should reject order if any product has insufficient inventory', async () => {
      // Setup mocks
      const mockCustomer = {
        id: 'customer-123',
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: () => true,
      };
      const mockProduct1 = {
        id: 'product-1',
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      };
      const mockProduct2 = {
        id: 'product-2',
        sku: 'PROD002',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(200, 'USD'),
      };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);
      mockLotBatchRepository.getAvailableQuantityForProduct
        .mockResolvedValueOnce(50) // Product 1: sufficient
        .mockResolvedValueOnce(5); // Product 2: insufficient (need 13, available 5)

      // Execute
      const result = await handler.execute(multiProductCommand);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory for product PROD002');
      expect(result.error).toContain('requested: 13, available: 5');
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Step 2.4: Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Setup mocks
      const mockCustomer = {
        id: 'customer-123',
        customerCode: 'CUST001',
        status: 'ACTIVE',
        creditLimit: Money.fromDecimal(10000, 'USD'),
        canPlaceOrders: () => true,
      };
      const mockProduct = {
        id: 'product-123',
        sku: 'PROD001',
        status: 'ACTIVE',
        sellingPrice: Money.fromDecimal(100, 'USD'),
      };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer as any);
      mockProductRepository.findById.mockResolvedValue(mockProduct as any);
      mockLotBatchRepository.getAvailableQuantityForProduct.mockRejectedValue(new Error('Database connection failed'));

      const orderCommand = {
        agencyId: '12345678-1234-1234-1234-123456789abc',
        customerId: '12345678-1234-1234-1234-123456789abc',
        customerCode: 'CUST001',
        customerName: 'Test Customer Ltd',
        customerCreditLimit: 10000,
        customerBalance: 2000,
        orderNumber: 'ORD-ERROR-001',
        orderDate: new Date(),
        areaCode: 'AREA001',
        areaName: 'Test Area',
        workerName: 'Test Worker',
        paymentMethod: PaymentMethod.CREDIT,
        requestedBy: '12345678-1234-1234-1234-123456789abc',
        items: [
          {
            productId: '12345678-1234-1234-1234-123456789abc',
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 100,
            boxSize: 10,
            quantityBoxes: 1,
            quantityLoose: 0,
          },
        ],
      };

      // Execute
      const result = await handler.execute(orderCommand);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });
});
