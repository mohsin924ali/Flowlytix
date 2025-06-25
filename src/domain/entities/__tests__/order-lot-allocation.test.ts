/**
 * Order Lot Allocation Tests
 * Step 2.3: Complete Lot/Batch Integration
 *
 * Tests lot allocation value objects, validation functions, and utility methods
 * Following TDD approach and Instructions file standards
 *
 * @testType Unit
 * @phase Order Repository Phase 2 Completion
 * @step 2.3
 */

import {
  OrderItemLotAllocation,
  OrderItemLotAllocationSummary,
  LotAllocationValidationError,
  validateLotAllocations,
  createLotAllocationSummary,
} from '../order-lot-allocation';

describe('Order Lot Allocation Value Objects', () => {
  const testUserId = '12345678-1234-1234-1234-123456789abc';
  const reservationDate = new Date('2024-01-15T10:00:00Z');

  const createTestLotAllocation = (overrides: Partial<OrderItemLotAllocation> = {}): OrderItemLotAllocation => ({
    lotBatchId: 'lot-001',
    lotNumber: 'LOT-001',
    batchNumber: 'BATCH-001',
    allocatedQuantity: 10,
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date('2024-12-31'),
    reservedAt: reservationDate,
    reservedBy: testUserId,
    ...overrides,
  });

  describe('validateLotAllocations', () => {
    it('should validate correct lot allocations successfully', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({ allocatedQuantity: 15 }),
        createTestLotAllocation({
          lotBatchId: 'lot-002',
          lotNumber: 'LOT-002',
          allocatedQuantity: 10,
        }),
      ];
      const expectedQuantity = 25;

      // Act & Assert - Should not throw
      expect(() => validateLotAllocations(allocations, expectedQuantity)).not.toThrow();
    });

    it('should throw error when allocations array is empty', () => {
      // Arrange
      const allocations: OrderItemLotAllocation[] = [];
      const expectedQuantity = 10;

      // Act & Assert
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(LotAllocationValidationError);
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(
        'Order item must have at least one lot allocation'
      );
    });

    it('should throw error when allocated quantity is zero or negative', () => {
      // Arrange
      const allocations = [createTestLotAllocation({ allocatedQuantity: 0 })];
      const expectedQuantity = 10;

      // Act & Assert
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(LotAllocationValidationError);
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(
        'Allocated quantity must be positive for lot LOT-001'
      );
    });

    it('should throw error when total allocated quantity does not match expected', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({ allocatedQuantity: 10 }),
        createTestLotAllocation({
          lotBatchId: 'lot-002',
          allocatedQuantity: 5,
        }),
      ];
      const expectedQuantity = 20; // Total allocated = 15, expected = 20

      // Act & Assert
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(LotAllocationValidationError);
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(
        'Total allocated quantity (15) must match expected quantity (20)'
      );
    });

    it('should throw error when lot batch ID is missing', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({
          lotBatchId: '',
          allocatedQuantity: 10,
        }),
      ];
      const expectedQuantity = 10;

      // Act & Assert
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(
        'Lot allocation must have valid lot batch ID and number'
      );
    });

    it('should throw error when reserved by user is missing', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({
          reservedBy: '',
          allocatedQuantity: 10,
        }),
      ];
      const expectedQuantity = 10;

      // Act & Assert
      expect(() => validateLotAllocations(allocations, expectedQuantity)).toThrow(
        'Lot allocation must have reservedBy user'
      );
    });
  });

  describe('createLotAllocationSummary', () => {
    it('should create correct summary for single lot allocation', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({
          allocatedQuantity: 25,
          manufacturingDate: new Date('2024-01-10'),
          expiryDate: new Date('2024-06-10'), // Expiring within 30 days from now (assuming test runs around 2024-01-15)
        }),
      ];

      // Act
      const summary = createLotAllocationSummary(allocations);

      // Assert
      expect(summary.totalAllocations).toBe(1);
      expect(summary.totalAllocatedQuantity).toBe(25);
      expect(summary.oldestLotDate).toEqual(new Date('2024-01-10'));
      expect(summary.newestLotDate).toEqual(new Date('2024-01-10'));
      expect(summary.allocations).toHaveLength(1);
      expect(summary.allocations[0]).toEqual(allocations[0]);
    });

    it('should create correct summary for multiple lot allocations', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({
          allocatedQuantity: 15,
          manufacturingDate: new Date('2024-01-01'), // Oldest
        }),
        createTestLotAllocation({
          lotBatchId: 'lot-002',
          allocatedQuantity: 20,
          manufacturingDate: new Date('2024-01-15'), // Newest
        }),
        createTestLotAllocation({
          lotBatchId: 'lot-003',
          allocatedQuantity: 10,
          manufacturingDate: new Date('2024-01-10'), // Middle
        }),
      ];

      // Act
      const summary = createLotAllocationSummary(allocations);

      // Assert
      expect(summary.totalAllocations).toBe(3);
      expect(summary.totalAllocatedQuantity).toBe(45);
      expect(summary.oldestLotDate).toEqual(new Date('2024-01-01'));
      expect(summary.newestLotDate).toEqual(new Date('2024-01-15'));
      expect(summary.allocations).toHaveLength(3);
    });

    it('should detect expiring lots correctly', () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20); // Expires in 20 days

      const allocations = [
        createTestLotAllocation({
          expiryDate: futureDate, // Within 30 days
        }),
      ];

      // Act
      const summary = createLotAllocationSummary(allocations);

      // Assert
      expect(summary.hasExpiringLots).toBe(true);
    });

    it('should handle lots without expiry dates', () => {
      // Arrange
      const allocations = [
        createTestLotAllocation({
          expiryDate: null,
        }),
      ];

      // Act
      const summary = createLotAllocationSummary(allocations);

      // Assert
      expect(summary.hasExpiringLots).toBe(false);
    });

    it('should throw error when creating summary from empty allocations', () => {
      // Arrange
      const allocations: OrderItemLotAllocation[] = [];

      // Act & Assert
      expect(() => createLotAllocationSummary(allocations)).toThrow(LotAllocationValidationError);
      expect(() => createLotAllocationSummary(allocations)).toThrow('Cannot create summary from empty allocations');
    });

    it('should return readonly allocations array', () => {
      // Arrange
      const allocations = [createTestLotAllocation()];

      // Act
      const summary = createLotAllocationSummary(allocations);

      // Assert
      expect(Object.isFrozen(summary.allocations)).toBe(true);
    });
  });
});
