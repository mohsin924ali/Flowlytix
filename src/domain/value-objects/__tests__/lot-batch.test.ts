/**
 * LotBatch Value Object Tests
 *
 * Comprehensive test suite covering all functionality of the LotBatch value object
 * including business logic, validation, status transitions, quantity management, and edge cases.
 *
 * @domain Product Management - Lot/Batch Tracking
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LotBatch,
  LotBatchProps,
  LotStatus,
  LotBatchDomainError,
  LotBatchValidationError,
  InvalidLotNumberError,
  InvalidDateRangeError,
  InsufficientLotQuantityError,
  ExpiredLotError,
  LotStatusError,
} from '../lot-batch';

describe('LotBatch Value Object', () => {
  let validLotBatchProps: LotBatchProps;
  let lotBatch: LotBatch;

  beforeEach(() => {
    const manufacturingDate = new Date();
    manufacturingDate.setDate(manufacturingDate.getDate() - 30); // 30 days ago

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90); // 90 days from now

    validLotBatchProps = {
      lotNumber: 'LOT-2024-001',
      batchNumber: 'BATCH-A1',
      manufacturingDate,
      expiryDate,
      quantity: 100,
      remainingQuantity: 100,
      productId: 'product-123',
      agencyId: 'agency-123',
      supplierId: 'supplier-123',
      supplierLotCode: 'SUP-LOT-456',
      notes: 'Test lot batch',
      createdBy: 'user-123',
    };

    lotBatch = LotBatch.create(validLotBatchProps);
  });

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create a lot batch with valid properties', () => {
        const newLotBatch = LotBatch.create(validLotBatchProps);

        expect(newLotBatch.lotNumber).toBe('LOT-2024-001');
        expect(newLotBatch.batchNumber).toBe('BATCH-A1');
        expect(newLotBatch.manufacturingDate).toEqual(validLotBatchProps.manufacturingDate);
        expect(newLotBatch.expiryDate).toEqual(validLotBatchProps.expiryDate);
        expect(newLotBatch.quantity).toBe(100);
        expect(newLotBatch.remainingQuantity).toBe(100);
        expect(newLotBatch.reservedQuantity).toBe(0);
        expect(newLotBatch.availableQuantity).toBe(100);
        expect(newLotBatch.status).toBe(LotStatus.ACTIVE);
        expect(newLotBatch.productId).toBe('product-123');
        expect(newLotBatch.agencyId).toBe('agency-123');
        expect(newLotBatch.supplierId).toBe('supplier-123');
        expect(newLotBatch.supplierLotCode).toBe('SUP-LOT-456');
        expect(newLotBatch.notes).toBe('Test lot batch');
        expect(newLotBatch.createdBy).toBe('user-123');
        expect(newLotBatch.id).toBeDefined();
        expect(newLotBatch.createdAt).toBeInstanceOf(Date);
      });

      it('should create lot batch with minimal required properties', () => {
        const minimalProps: LotBatchProps = {
          lotNumber: 'LOT-MIN-001',
          manufacturingDate: new Date(),
          quantity: 50,
          productId: 'product-123',
          agencyId: 'agency-123',
          createdBy: 'user-123',
        };

        const newLotBatch = LotBatch.create(minimalProps);

        expect(newLotBatch.lotNumber).toBe('LOT-MIN-001');
        expect(newLotBatch.batchNumber).toBeNull();
        expect(newLotBatch.expiryDate).toBeNull();
        expect(newLotBatch.quantity).toBe(50);
        expect(newLotBatch.remainingQuantity).toBe(50);
        expect(newLotBatch.supplierId).toBeNull();
        expect(newLotBatch.supplierLotCode).toBeNull();
        expect(newLotBatch.notes).toBeNull();
      });

      it('should automatically set status to EXPIRED for expired lots', () => {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

        const expiredProps: LotBatchProps = {
          ...validLotBatchProps,
          expiryDate: expiredDate,
        };

        const expiredLotBatch = LotBatch.create(expiredProps);

        expect(expiredLotBatch.status).toBe(LotStatus.EXPIRED);
        expect(expiredLotBatch.isExpired()).toBe(true);
      });

      it('should generate unique IDs for different lots', () => {
        const lot1 = LotBatch.create(validLotBatchProps);
        const lot2 = LotBatch.create(validLotBatchProps);

        expect(lot1.id).not.toBe(lot2.id);
      });

      it('should freeze the lot batch instance', () => {
        const newLotBatch = LotBatch.create(validLotBatchProps);

        expect(Object.isFrozen(newLotBatch)).toBe(true);
      });
    });

    describe('fromPersistence', () => {
      it('should reconstruct lot batch from persistence data', () => {
        const persistenceData = lotBatch.toPersistence();
        const reconstructed = LotBatch.fromPersistence(persistenceData);

        expect(reconstructed.id).toBe(lotBatch.id);
        expect(reconstructed.lotNumber).toBe(lotBatch.lotNumber);
        expect(reconstructed.batchNumber).toBe(lotBatch.batchNumber);
        expect(reconstructed.manufacturingDate.getTime()).toBe(lotBatch.manufacturingDate.getTime());
        expect(reconstructed.expiryDate?.getTime()).toBe(lotBatch.expiryDate?.getTime());
        expect(reconstructed.quantity).toBe(lotBatch.quantity);
        expect(reconstructed.remainingQuantity).toBe(lotBatch.remainingQuantity);
        expect(reconstructed.status).toBe(lotBatch.status);
        expect(reconstructed.createdAt.getTime()).toBe(lotBatch.createdAt.getTime());
      });

      it('should handle lot batch with null optional fields', () => {
        const persistenceData = {
          ...lotBatch.toPersistence(),
          batchNumber: null,
          expiryDate: null,
          supplierId: null,
          supplierLotCode: null,
          notes: null,
        };

        const reconstructed = LotBatch.fromPersistence(persistenceData);

        expect(reconstructed.batchNumber).toBeNull();
        expect(reconstructed.expiryDate).toBeNull();
        expect(reconstructed.supplierId).toBeNull();
        expect(reconstructed.supplierLotCode).toBeNull();
        expect(reconstructed.notes).toBeNull();
      });
    });
  });

  describe('Validation', () => {
    describe('Lot number validation', () => {
      it('should throw InvalidLotNumberError for empty lot number', () => {
        const props = { ...validLotBatchProps, lotNumber: '' };

        expect(() => LotBatch.create(props)).toThrow(InvalidLotNumberError);
        expect(() => LotBatch.create(props)).toThrow('Lot number cannot be empty');
      });

      it('should throw InvalidLotNumberError for whitespace-only lot number', () => {
        const props = { ...validLotBatchProps, lotNumber: '   ' };

        expect(() => LotBatch.create(props)).toThrow(InvalidLotNumberError);
      });

      it('should throw InvalidLotNumberError for lot number exceeding length limit', () => {
        const props = { ...validLotBatchProps, lotNumber: 'A'.repeat(51) };

        expect(() => LotBatch.create(props)).toThrow(InvalidLotNumberError);
        expect(() => LotBatch.create(props)).toThrow('Lot number cannot exceed 50 characters');
      });

      it('should throw InvalidLotNumberError for lot number with invalid characters', () => {
        const invalidLotNumbers = ['LOT@123', 'LOT 123', 'LOT#456', 'LOT$789'];

        invalidLotNumbers.forEach((lotNumber) => {
          const props = { ...validLotBatchProps, lotNumber };
          expect(() => LotBatch.create(props)).toThrow(InvalidLotNumberError);
        });
      });

      it('should accept valid lot number formats', () => {
        const validLotNumbers = ['LOT-123', 'BATCH_456', 'LOT789', 'A-B_C/123', 'LOT/2024/001'];

        validLotNumbers.forEach((lotNumber) => {
          const props = { ...validLotBatchProps, lotNumber };
          expect(() => LotBatch.create(props)).not.toThrow();
        });
      });
    });

    describe('Batch number validation', () => {
      it('should throw LotBatchValidationError for batch number exceeding length limit', () => {
        const props = { ...validLotBatchProps, batchNumber: 'B'.repeat(51) };

        expect(() => LotBatch.create(props)).toThrow(LotBatchValidationError);
        expect(() => LotBatch.create(props)).toThrow('Batch number cannot exceed 50 characters');
      });

      it('should throw LotBatchValidationError for batch number with invalid characters', () => {
        const invalidBatchNumbers = ['BATCH@123', 'BATCH 123', 'BATCH#456'];

        invalidBatchNumbers.forEach((batchNumber) => {
          const props = { ...validLotBatchProps, batchNumber };
          expect(() => LotBatch.create(props)).toThrow(LotBatchValidationError);
        });
      });

      it('should accept valid batch number formats', () => {
        const validBatchNumbers = ['BAT-123', 'B_456', 'B789', 'A/B/C'];

        validBatchNumbers.forEach((batchNumber) => {
          const props = { ...validLotBatchProps, batchNumber };
          expect(() => LotBatch.create(props)).not.toThrow();
        });
      });
    });

    describe('Date validation', () => {
      it('should throw InvalidDateRangeError for future manufacturing date', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const props = { ...validLotBatchProps, manufacturingDate: futureDate };

        expect(() => LotBatch.create(props)).toThrow(InvalidDateRangeError);
        expect(() => LotBatch.create(props)).toThrow('Manufacturing date cannot be in the future');
      });

      it('should throw InvalidDateRangeError for expiry date before manufacturing date', () => {
        const manufacturingDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(manufacturingDate.getDate() - 1);

        const props = {
          ...validLotBatchProps,
          manufacturingDate,
          expiryDate,
        };

        expect(() => LotBatch.create(props)).toThrow(InvalidDateRangeError);
        expect(() => LotBatch.create(props)).toThrow('Expiry date must be after manufacturing date');
      });

      it('should throw InvalidDateRangeError for expiry date equal to manufacturing date', () => {
        const date = new Date();

        const props = {
          ...validLotBatchProps,
          manufacturingDate: date,
          expiryDate: date,
        };

        expect(() => LotBatch.create(props)).toThrow(InvalidDateRangeError);
      });

      it('should accept valid date ranges', () => {
        const manufacturingDate = new Date();
        manufacturingDate.setDate(manufacturingDate.getDate() - 30);

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);

        const props = {
          ...validLotBatchProps,
          manufacturingDate,
          expiryDate,
        };

        expect(() => LotBatch.create(props)).not.toThrow();
      });

      it('should accept lot without expiry date', () => {
        const props = {
          ...validLotBatchProps,
          expiryDate: undefined,
        };

        const lotBatch = LotBatch.create(props);
        expect(lotBatch.expiryDate).toBeNull();
      });
    });

    describe('Quantity validation', () => {
      it('should throw LotBatchValidationError for negative quantity', () => {
        const props = { ...validLotBatchProps, quantity: -1 };

        expect(() => LotBatch.create(props)).toThrow(LotBatchValidationError);
        expect(() => LotBatch.create(props)).toThrow('Quantity cannot be negative');
      });

      it('should throw LotBatchValidationError for negative remaining quantity', () => {
        const props = { ...validLotBatchProps, remainingQuantity: -1 };

        expect(() => LotBatch.create(props)).toThrow(LotBatchValidationError);
        expect(() => LotBatch.create(props)).toThrow('Remaining quantity cannot be negative');
      });

      it('should throw LotBatchValidationError for remaining quantity exceeding original quantity', () => {
        const props = { ...validLotBatchProps, quantity: 50, remainingQuantity: 60 };

        expect(() => LotBatch.create(props)).toThrow(LotBatchValidationError);
        expect(() => LotBatch.create(props)).toThrow('Remaining quantity cannot exceed original quantity');
      });

      it('should accept zero quantities', () => {
        const props = { ...validLotBatchProps, quantity: 0, remainingQuantity: 0 };

        expect(() => LotBatch.create(props)).not.toThrow();
      });
    });
  });

  describe('Business Logic Methods', () => {
    describe('isExpired', () => {
      it('should return false for lot without expiry date', () => {
        const noExpiryProps = { ...validLotBatchProps, expiryDate: undefined };
        const noExpiryLot = LotBatch.create(noExpiryProps);

        expect(noExpiryLot.isExpired()).toBe(false);
      });

      it('should return false for lot with future expiry date', () => {
        const futureExpiry = new Date();
        futureExpiry.setDate(futureExpiry.getDate() + 30);

        const futureExpiryProps = { ...validLotBatchProps, expiryDate: futureExpiry };
        const futureExpiryLot = LotBatch.create(futureExpiryProps);

        expect(futureExpiryLot.isExpired()).toBe(false);
      });

      it('should return true for lot with past expiry date', () => {
        const pastExpiry = new Date();
        pastExpiry.setDate(pastExpiry.getDate() - 1);

        const pastExpiryProps = { ...validLotBatchProps, expiryDate: pastExpiry };
        const pastExpiryLot = LotBatch.create(pastExpiryProps);

        expect(pastExpiryLot.isExpired()).toBe(true);
      });
    });

    describe('isNearExpiry', () => {
      it('should return false for lot without expiry date', () => {
        const noExpiryProps = { ...validLotBatchProps, expiryDate: undefined };
        const noExpiryLot = LotBatch.create(noExpiryProps);

        expect(noExpiryLot.isNearExpiry()).toBe(false);
      });

      it('should return false for lot with expiry date far in future', () => {
        const farFutureExpiry = new Date();
        farFutureExpiry.setDate(farFutureExpiry.getDate() + 60);

        const farFutureProps = { ...validLotBatchProps, expiryDate: farFutureExpiry };
        const farFutureLot = LotBatch.create(farFutureProps);

        expect(farFutureLot.isNearExpiry()).toBe(false);
      });

      it('should return true for lot expiring within default threshold (30 days)', () => {
        const nearExpiry = new Date();
        nearExpiry.setDate(nearExpiry.getDate() + 15);

        const nearExpiryProps = { ...validLotBatchProps, expiryDate: nearExpiry };
        const nearExpiryLot = LotBatch.create(nearExpiryProps);

        expect(nearExpiryLot.isNearExpiry()).toBe(true);
      });

      it('should return true for lot expiring within custom threshold', () => {
        const customThresholdExpiry = new Date();
        customThresholdExpiry.setDate(customThresholdExpiry.getDate() + 45);

        const customProps = { ...validLotBatchProps, expiryDate: customThresholdExpiry };
        const customLot = LotBatch.create(customProps);

        expect(customLot.isNearExpiry(60)).toBe(true);
        expect(customLot.isNearExpiry(30)).toBe(false);
      });
    });

    describe('isAvailable', () => {
      it('should return true for active lot with available quantity', () => {
        expect(lotBatch.isAvailable()).toBe(true);
      });

      it('should return false for expired lot', () => {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1);

        const expiredProps = { ...validLotBatchProps, expiryDate: expiredDate };
        const expiredLot = LotBatch.create(expiredProps);

        expect(expiredLot.isAvailable()).toBe(false);
      });

      it('should return false for lot with zero available quantity', () => {
        const reservedLot = lotBatch.reserve(100, 'user-456');

        expect(reservedLot.isAvailable()).toBe(false);
      });

      it('should return false for quarantined lot', () => {
        const quarantinedLot = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');

        expect(quarantinedLot.isAvailable()).toBe(false);
      });
    });

    describe('isFullyConsumed', () => {
      it('should return false for lot with remaining quantity', () => {
        expect(lotBatch.isFullyConsumed()).toBe(false);
      });

      it('should return true for lot with zero remaining quantity', () => {
        const consumedLot = lotBatch.consume(100, 'user-456');

        expect(consumedLot.isFullyConsumed()).toBe(true);
      });
    });

    describe('getDaysUntilExpiry', () => {
      it('should return null for lot without expiry date', () => {
        const noExpiryProps = { ...validLotBatchProps, expiryDate: undefined };
        const noExpiryLot = LotBatch.create(noExpiryProps);

        expect(noExpiryLot.getDaysUntilExpiry()).toBeNull();
      });

      it('should return positive number for future expiry', () => {
        const futureExpiry = new Date();
        futureExpiry.setDate(futureExpiry.getDate() + 30);

        const futureProps = { ...validLotBatchProps, expiryDate: futureExpiry };
        const futureLot = LotBatch.create(futureProps);

        const daysUntilExpiry = futureLot.getDaysUntilExpiry();
        expect(daysUntilExpiry).toBeGreaterThan(0);
        expect(daysUntilExpiry).toBeLessThanOrEqual(30);
      });

      it('should return negative number for past expiry', () => {
        const pastExpiry = new Date();
        pastExpiry.setDate(pastExpiry.getDate() - 5);

        const pastProps = { ...validLotBatchProps, expiryDate: pastExpiry };
        const pastLot = LotBatch.create(pastProps);

        const daysUntilExpiry = pastLot.getDaysUntilExpiry();
        expect(daysUntilExpiry).toBeLessThan(0);
      });
    });
  });

  describe('Quantity Management', () => {
    describe('reserve', () => {
      it('should reserve quantity successfully', () => {
        const reservedLot = lotBatch.reserve(30, 'user-456');

        expect(reservedLot.reservedQuantity).toBe(30);
        expect(reservedLot.availableQuantity).toBe(70);
        expect(reservedLot.remainingQuantity).toBe(100);
        expect(reservedLot.updatedBy).toBe('user-456');
        expect(reservedLot.updatedAt).toBeInstanceOf(Date);
      });

      it('should throw LotBatchValidationError for zero or negative quantity', () => {
        expect(() => lotBatch.reserve(0, 'user-456')).toThrow(LotBatchValidationError);
        expect(() => lotBatch.reserve(-5, 'user-456')).toThrow(LotBatchValidationError);
      });

      it('should throw InsufficientLotQuantityError for quantity exceeding available', () => {
        expect(() => lotBatch.reserve(150, 'user-456')).toThrow(InsufficientLotQuantityError);
        expect(() => lotBatch.reserve(150, 'user-456')).toThrow(
          'Insufficient quantity in lot LOT-2024-001: requested 150, available 100'
        );
      });

      it('should throw LotStatusError for unavailable lot', () => {
        const quarantinedLot = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');

        expect(() => quarantinedLot.reserve(10, 'user-789')).toThrow(LotStatusError);
      });

      it('should allow multiple reservations up to available quantity', () => {
        const reserved1 = lotBatch.reserve(30, 'user-456');
        const reserved2 = reserved1.reserve(40, 'user-789');

        expect(reserved2.reservedQuantity).toBe(70);
        expect(reserved2.availableQuantity).toBe(30);
      });
    });

    describe('releaseReserved', () => {
      it('should release reserved quantity successfully', () => {
        const reservedLot = lotBatch.reserve(50, 'user-456');
        const releasedLot = reservedLot.releaseReserved(20, 'user-789');

        expect(releasedLot.reservedQuantity).toBe(30);
        expect(releasedLot.availableQuantity).toBe(70);
        expect(releasedLot.updatedBy).toBe('user-789');
      });

      it('should throw LotBatchValidationError for zero or negative quantity', () => {
        const reservedLot = lotBatch.reserve(50, 'user-456');

        expect(() => reservedLot.releaseReserved(0, 'user-789')).toThrow(LotBatchValidationError);
        expect(() => reservedLot.releaseReserved(-5, 'user-789')).toThrow(LotBatchValidationError);
      });

      it('should throw LotBatchValidationError for quantity exceeding reserved', () => {
        const reservedLot = lotBatch.reserve(30, 'user-456');

        expect(() => reservedLot.releaseReserved(50, 'user-789')).toThrow(LotBatchValidationError);
        expect(() => reservedLot.releaseReserved(50, 'user-789')).toThrow('Cannot release 50, only 30 reserved');
      });

      it('should release all reserved quantity', () => {
        const reservedLot = lotBatch.reserve(50, 'user-456');
        const releasedLot = reservedLot.releaseReserved(50, 'user-789');

        expect(releasedLot.reservedQuantity).toBe(0);
        expect(releasedLot.availableQuantity).toBe(100);
      });
    });

    describe('consume', () => {
      it('should consume quantity successfully', () => {
        const consumedLot = lotBatch.consume(25, 'user-456');

        expect(consumedLot.remainingQuantity).toBe(75);
        expect(consumedLot.availableQuantity).toBe(75);
        expect(consumedLot.status).toBe(LotStatus.ACTIVE);
        expect(consumedLot.updatedBy).toBe('user-456');
      });

      it('should set status to CONSUMED when fully consumed', () => {
        const consumedLot = lotBatch.consume(100, 'user-456');

        expect(consumedLot.remainingQuantity).toBe(0);
        expect(consumedLot.status).toBe(LotStatus.CONSUMED);
        expect(consumedLot.isFullyConsumed()).toBe(true);
      });

      it('should reduce reserved quantity when consuming', () => {
        const reservedLot = lotBatch.reserve(50, 'user-456');
        const consumedLot = reservedLot.consume(30, 'user-789');

        expect(consumedLot.remainingQuantity).toBe(70);
        expect(consumedLot.reservedQuantity).toBe(20);
        expect(consumedLot.availableQuantity).toBe(50);
      });

      it('should throw LotBatchValidationError for zero or negative quantity', () => {
        expect(() => lotBatch.consume(0, 'user-456')).toThrow(LotBatchValidationError);
        expect(() => lotBatch.consume(-5, 'user-456')).toThrow(LotBatchValidationError);
      });

      it('should throw InsufficientLotQuantityError for quantity exceeding remaining', () => {
        expect(() => lotBatch.consume(150, 'user-456')).toThrow(InsufficientLotQuantityError);
      });

      it('should allow consumption from reserved lot', () => {
        const reservedLot = lotBatch.updateStatus(LotStatus.RESERVED, 'user-456');
        const consumedLot = reservedLot.consume(25, 'user-789');

        expect(consumedLot.remainingQuantity).toBe(75);
        expect(consumedLot.status).toBe(LotStatus.RESERVED);
      });

      it('should throw LotStatusError for unavailable lot status', () => {
        const quarantinedLot = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');

        expect(() => quarantinedLot.consume(10, 'user-789')).toThrow(LotStatusError);
      });
    });
  });

  describe('Status Management', () => {
    describe('updateStatus', () => {
      it('should update status successfully', () => {
        const quarantinedLot = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');

        expect(quarantinedLot.status).toBe(LotStatus.QUARANTINE);
        expect(quarantinedLot.updatedBy).toBe('user-456');
        expect(quarantinedLot.updatedAt).toBeInstanceOf(Date);
      });

      it('should return same instance for identical status', () => {
        const sameLot = lotBatch.updateStatus(LotStatus.ACTIVE, 'user-456');

        expect(sameLot).toBe(lotBatch);
      });

      it('should allow valid status transitions from ACTIVE', () => {
        const validTransitions = [
          LotStatus.QUARANTINE,
          LotStatus.EXPIRED,
          LotStatus.RECALLED,
          LotStatus.DAMAGED,
          LotStatus.RESERVED,
          LotStatus.CONSUMED,
        ];

        validTransitions.forEach((status) => {
          expect(() => lotBatch.updateStatus(status, 'user-456')).not.toThrow();
        });
      });

      it('should allow valid status transitions from QUARANTINE', () => {
        const quarantinedLot = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');
        const validTransitions = [LotStatus.ACTIVE, LotStatus.DAMAGED, LotStatus.RECALLED, LotStatus.EXPIRED];

        validTransitions.forEach((status) => {
          expect(() => quarantinedLot.updateStatus(status, 'user-789')).not.toThrow();
        });
      });

      it('should throw LotStatusError for invalid status transitions', () => {
        const recalledLot = lotBatch.updateStatus(LotStatus.RECALLED, 'user-456');

        // RECALLED is terminal state, no transitions allowed
        expect(() => recalledLot.updateStatus(LotStatus.ACTIVE, 'user-789')).toThrow(LotStatusError);
      });

      it('should throw LotStatusError for terminal state transitions', () => {
        const consumedLot = lotBatch.updateStatus(LotStatus.CONSUMED, 'user-456');

        expect(() => consumedLot.updateStatus(LotStatus.ACTIVE, 'user-789')).toThrow(LotStatusError);
      });
    });
  });

  describe('Persistence and Display', () => {
    describe('toPersistence', () => {
      it('should convert to persistence format correctly', () => {
        const persistence = lotBatch.toPersistence();

        expect(persistence.id).toBe(lotBatch.id);
        expect(persistence.lotNumber).toBe(lotBatch.lotNumber);
        expect(persistence.batchNumber).toBe(lotBatch.batchNumber);
        expect(persistence.manufacturingDate).toEqual(lotBatch.manufacturingDate);
        expect(persistence.expiryDate).toEqual(lotBatch.expiryDate);
        expect(persistence.quantity).toBe(lotBatch.quantity);
        expect(persistence.remainingQuantity).toBe(lotBatch.remainingQuantity);
        expect(persistence.reservedQuantity).toBe(lotBatch.reservedQuantity);
        expect(persistence.availableQuantity).toBe(lotBatch.availableQuantity);
        expect(persistence.status).toBe(lotBatch.status);
        expect(persistence.productId).toBe(lotBatch.productId);
        expect(persistence.agencyId).toBe(lotBatch.agencyId);
        expect(persistence.supplierId).toBe(lotBatch.supplierId);
        expect(persistence.supplierLotCode).toBe(lotBatch.supplierLotCode);
        expect(persistence.notes).toBe(lotBatch.notes);
        expect(persistence.createdBy).toBe(lotBatch.createdBy);
        expect(persistence.createdAt).toEqual(lotBatch.createdAt);
        expect(persistence.updatedBy).toBe(lotBatch.updatedBy);
        expect(persistence.updatedAt).toEqual(lotBatch.updatedAt);
      });
    });

    describe('getDisplayInfo', () => {
      it('should return display information correctly', () => {
        const displayInfo = lotBatch.getDisplayInfo();

        expect(displayInfo.id).toBe(lotBatch.id);
        expect(displayInfo.lotNumber).toBe(lotBatch.lotNumber);
        expect(displayInfo.batchNumber).toBe(lotBatch.batchNumber);
        expect(displayInfo.manufacturingDate).toBe(lotBatch.manufacturingDate.toISOString());
        expect(displayInfo.expiryDate).toBe(lotBatch.expiryDate?.toISOString());
        expect(displayInfo.quantity).toBe(lotBatch.quantity);
        expect(displayInfo.remainingQuantity).toBe(lotBatch.remainingQuantity);
        expect(displayInfo.reservedQuantity).toBe(lotBatch.reservedQuantity);
        expect(displayInfo.availableQuantity).toBe(lotBatch.availableQuantity);
        expect(displayInfo.status).toBe(lotBatch.status);
        expect(displayInfo.isExpired).toBe(lotBatch.isExpired());
        expect(displayInfo.isNearExpiry).toBe(lotBatch.isNearExpiry());
        expect(displayInfo.isAvailable).toBe(lotBatch.isAvailable());
        expect(displayInfo.daysUntilExpiry).toBe(lotBatch.getDaysUntilExpiry());
        expect(displayInfo.createdAt).toBe(lotBatch.createdAt.toISOString());
        expect(displayInfo.updatedAt).toBeNull();
      });

      it('should handle null values in display info', () => {
        const noExpiryProps = {
          ...validLotBatchProps,
          batchNumber: undefined,
          expiryDate: undefined,
          supplierId: undefined,
          supplierLotCode: undefined,
          notes: undefined,
        };
        const noExpiryLot = LotBatch.create(noExpiryProps);
        const displayInfo = noExpiryLot.getDisplayInfo();

        expect(displayInfo.batchNumber).toBeNull();
        expect(displayInfo.expiryDate).toBeNull();
        expect(displayInfo.daysUntilExpiry).toBeNull();
        expect(displayInfo.isExpired).toBe(false);
        expect(displayInfo.isNearExpiry).toBe(false);
      });
    });
  });

  describe('Error Classes', () => {
    it('should have proper error hierarchy', () => {
      const domainError = new LotBatchDomainError('Test error', 'TEST_ERROR');
      const validationError = new LotBatchValidationError('Validation error');
      const lotNumberError = new InvalidLotNumberError('INVALID-LOT');
      const dateRangeError = new InvalidDateRangeError('Invalid date range');
      const insufficientQuantityError = new InsufficientLotQuantityError(10, 5, 'LOT-123');
      const expiredLotError = new ExpiredLotError('LOT-123', new Date());
      const statusError = new LotStatusError('test operation', LotStatus.ACTIVE, 'LOT-123');

      expect(domainError).toBeInstanceOf(Error);
      expect(domainError).toBeInstanceOf(LotBatchDomainError);
      expect(domainError.name).toBe('LotBatchDomainError');
      expect(domainError.code).toBe('TEST_ERROR');

      expect(validationError).toBeInstanceOf(LotBatchDomainError);
      expect(validationError.name).toBe('LotBatchValidationError');

      expect(lotNumberError).toBeInstanceOf(LotBatchValidationError);
      expect(lotNumberError.name).toBe('InvalidLotNumberError');

      expect(dateRangeError).toBeInstanceOf(LotBatchValidationError);
      expect(dateRangeError.name).toBe('InvalidDateRangeError');

      expect(insufficientQuantityError).toBeInstanceOf(LotBatchDomainError);
      expect(insufficientQuantityError.name).toBe('InsufficientLotQuantityError');
      expect(insufficientQuantityError.code).toBe('INSUFFICIENT_LOT_QUANTITY');

      expect(expiredLotError).toBeInstanceOf(LotBatchDomainError);
      expect(expiredLotError.name).toBe('ExpiredLotError');
      expect(expiredLotError.code).toBe('EXPIRED_LOT');

      expect(statusError).toBeInstanceOf(LotBatchDomainError);
      expect(statusError.name).toBe('LotStatusError');
      expect(statusError.code).toBe('INVALID_LOT_STATUS');
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle lot with exact expiry date today', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      const todayExpiryProps = { ...validLotBatchProps, expiryDate: today };
      const todayExpiryLot = LotBatch.create(todayExpiryProps);

      expect(todayExpiryLot.isExpired()).toBe(false);
      expect(todayExpiryLot.isNearExpiry(1)).toBe(true);
    });

    it('should handle complex reservation and consumption scenario', () => {
      // Reserve 40, consume 30 (consumption reduces reserved quantity)
      const reserved = lotBatch.reserve(40, 'user-456');
      const consumed = reserved.consume(30, 'user-789');

      expect(consumed.remainingQuantity).toBe(70); // 100 - 30
      expect(consumed.reservedQuantity).toBe(10); // Math.max(0, 40 - 30)
      expect(consumed.availableQuantity).toBe(60); // 70 - 10
    });

    it('should handle status transitions with quantity operations', () => {
      const quarantined = lotBatch.updateStatus(LotStatus.QUARANTINE, 'user-456');
      const released = quarantined.updateStatus(LotStatus.ACTIVE, 'user-789');
      const reserved = released.reserve(25, 'user-abc');
      const consumed = reserved.consume(15, 'user-def');

      expect(consumed.status).toBe(LotStatus.ACTIVE);
      expect(consumed.remainingQuantity).toBe(85);
      expect(consumed.reservedQuantity).toBe(10);
      expect(consumed.availableQuantity).toBe(75);
    });

    it('should maintain immutability through all operations', () => {
      const original = lotBatch;
      const reserved = original.reserve(25, 'user-456');
      const consumed = reserved.consume(10, 'user-789');
      const statusChanged = consumed.updateStatus(LotStatus.QUARANTINE, 'user-abc');

      // Original should remain unchanged
      expect(original.reservedQuantity).toBe(0);
      expect(original.remainingQuantity).toBe(100);
      expect(original.status).toBe(LotStatus.ACTIVE);

      // Each operation should create new instance
      expect(reserved.reservedQuantity).toBe(25);
      expect(consumed.remainingQuantity).toBe(90);
      expect(statusChanged.status).toBe(LotStatus.QUARANTINE);

      // All should be different instances
      expect(original).not.toBe(reserved);
      expect(reserved).not.toBe(consumed);
      expect(consumed).not.toBe(statusChanged);
    });
  });
});
