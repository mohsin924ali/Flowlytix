/**
 * Shipping Entity Tests - Step 3A
 *
 * Comprehensive test suite for the Shipping domain entity including:
 * - Entity creation and validation
 * - Business logic and status transitions
 * - Audit trail management
 * - Error handling and edge cases
 * - Persistence serialization
 *
 * @domain Order Management - Shipping Operations
 * @version 1.0.0 - Step 3A: Shipping Domain Layer
 */

import {
  Shipping,
  ShippingStatus,
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingActionType,
  ShippingValidationError,
  ShippingStatusError,
  CarrierValidationError,
  type ShippingProps,
  type ShippingAddress,
  type PackageDimensions,
  type DeliveryAttempt,
  type TrackingEvent,
  type ShippingAuditEntry,
} from '../shipping';
import { Money } from '../../value-objects/money';

describe('Shipping Entity - Step 3A', () => {
  // Test data setup
  const testUserId = 'user-123';
  const testOrderId = 'order-456';
  const testCustomerId = 'customer-789';
  const testAgencyId = 'agency-abc';

  const validShippingAddress: ShippingAddress = {
    name: 'John Doe',
    company: 'Test Company',
    street1: '123 Main St',
    street2: 'Suite 100',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'USA',
    phone: '+1-555-0123',
    email: 'john@example.com',
    deliveryInstructions: 'Leave at front door',
    addressType: 'COMMERCIAL',
    isValidated: true,
  };

  const validReturnAddress: ShippingAddress = {
    name: 'ABC Distribution',
    company: 'ABC Distribution LLC',
    street1: '456 Warehouse Ave',
    city: 'Distribution Center',
    state: 'TX',
    zipCode: '67890',
    country: 'USA',
    addressType: 'COMMERCIAL',
    isValidated: true,
  };

  const validPackageDimensions: PackageDimensions = {
    length: 30,
    width: 20,
    height: 15,
    weight: 5.5,
    volumetricWeight: 2.25,
  };

  const validShippingProps: ShippingProps = {
    orderId: testOrderId,
    orderNumber: 'ORD-001',
    customerId: testCustomerId,
    customerName: 'John Doe',
    shippingAddress: validShippingAddress,
    returnAddress: validReturnAddress,
    carrier: ShippingCarrier.UPS,
    serviceType: ShippingServiceType.STANDARD,
    priority: ShippingPriority.NORMAL,
    packageDimensions: validPackageDimensions,
    declaredValue: Money.fromDecimal(250.0, 'USD'),
    shippingCost: Money.fromDecimal(15.99, 'USD'),
    trackingNumber: 'UPS123456789',
    labelUrl: 'https://example.com/label.pdf',
    estimatedDeliveryDate: new Date('2024-02-15'),
    requiresSignature: true,
    isInsured: true,
    insuranceValue: Money.fromDecimal(250.0, 'USD'),
    specialInstructions: 'Handle with care',
    agencyId: testAgencyId,
    createdBy: testUserId,
  };

  describe('Shipping Creation', () => {
    it('should create shipping with valid props', () => {
      const shipping = Shipping.create(validShippingProps);

      expect(shipping.id).toBeDefined();
      expect(shipping.orderId).toBe(validShippingProps.orderId);
      expect(shipping.orderNumber).toBe(validShippingProps.orderNumber);
      expect(shipping.customerId).toBe(validShippingProps.customerId);
      expect(shipping.customerName).toBe(validShippingProps.customerName);
      expect(shipping.trackingNumber).toBe(validShippingProps.trackingNumber);
      expect(shipping.carrier).toBe(validShippingProps.carrier);
      expect(shipping.serviceType).toBe(validShippingProps.serviceType);
      expect(shipping.priority).toBe(validShippingProps.priority);
      expect(shipping.status).toBe(ShippingStatus.PENDING);
      expect(shipping.shippingAddress).toEqual(validShippingProps.shippingAddress);
      expect(shipping.returnAddress).toEqual(validShippingProps.returnAddress);
      expect(shipping.packageDimensions).toEqual(validShippingProps.packageDimensions);
      expect(shipping.declaredValue).toBe(validShippingProps.declaredValue);
      expect(shipping.shippingCost).toBe(validShippingProps.shippingCost);
      expect(shipping.labelUrl).toBe(validShippingProps.labelUrl);
      expect(shipping.estimatedDeliveryDate).toBe(validShippingProps.estimatedDeliveryDate);
      expect(shipping.requiresSignature).toBe(validShippingProps.requiresSignature);
      expect(shipping.isInsured).toBe(validShippingProps.isInsured);
      expect(shipping.insuranceValue).toBe(validShippingProps.insuranceValue);
      expect(shipping.specialInstructions).toBe(validShippingProps.specialInstructions);
      expect(shipping.agencyId).toBe(validShippingProps.agencyId);
      expect(shipping.createdBy).toBe(validShippingProps.createdBy);
      expect(shipping.createdAt).toBeInstanceOf(Date);
      expect(shipping.updatedBy).toBeNull();
      expect(shipping.updatedAt).toBeNull();
      expect(shipping.actualDeliveryDate).toBeNull();
      expect(shipping.deliveryAttempts).toEqual([]);
      expect(shipping.trackingEvents).toEqual([]);
      expect(shipping.auditTrail).toEqual([]);
    });

    it('should create shipping without optional props', () => {
      const minimalProps: ShippingProps = {
        orderId: testOrderId,
        orderNumber: 'ORD-002',
        customerId: testCustomerId,
        customerName: 'Jane Doe',
        shippingAddress: validShippingAddress,
        returnAddress: validReturnAddress,
        carrier: ShippingCarrier.FEDEX,
        serviceType: ShippingServiceType.EXPRESS,
        priority: ShippingPriority.HIGH,
        packageDimensions: validPackageDimensions,
        declaredValue: Money.fromDecimal(100.0, 'USD'),
        shippingCost: Money.fromDecimal(25.99, 'USD'),
        requiresSignature: false,
        isInsured: false,
        agencyId: testAgencyId,
        createdBy: testUserId,
      };

      const shipping = Shipping.create(minimalProps);

      expect(shipping.trackingNumber).toBeNull();
      expect(shipping.labelUrl).toBeNull();
      expect(shipping.estimatedDeliveryDate).toBeNull();
      expect(shipping.insuranceValue).toBeNull();
      expect(shipping.specialInstructions).toBeNull();
    });
  });

  describe('Shipping Validation', () => {
    it('should reject missing order ID', () => {
      const invalidProps = {
        ...validShippingProps,
        orderId: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject missing order number', () => {
      const invalidProps = {
        ...validShippingProps,
        orderNumber: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject missing customer ID', () => {
      const invalidProps = {
        ...validShippingProps,
        customerId: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject missing customer name', () => {
      const invalidProps = {
        ...validShippingProps,
        customerName: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject missing agency ID', () => {
      const invalidProps = {
        ...validShippingProps,
        agencyId: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject missing created by', () => {
      const invalidProps = {
        ...validShippingProps,
        createdBy: '',
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject invalid shipping address', () => {
      const invalidProps = {
        ...validShippingProps,
        shippingAddress: {
          ...validShippingAddress,
          name: '',
        },
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject invalid return address', () => {
      const invalidProps = {
        ...validShippingProps,
        returnAddress: {
          ...validReturnAddress,
          street1: '',
        },
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject invalid package dimensions', () => {
      const invalidProps = {
        ...validShippingProps,
        packageDimensions: {
          ...validPackageDimensions,
          length: 0,
        },
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject package dimensions exceeding carrier limits', () => {
      const invalidProps = {
        ...validShippingProps,
        packageDimensions: {
          ...validPackageDimensions,
          length: 300, // Exceeds 270cm limit
        },
      };

      expect(() => Shipping.create(invalidProps)).toThrow(ShippingValidationError);
    });

    it('should reject invalid carrier/service type combination', () => {
      const invalidProps = {
        ...validShippingProps,
        carrier: ShippingCarrier.DHL,
        serviceType: ShippingServiceType.GROUND, // DHL doesn't support GROUND
      };

      expect(() => Shipping.create(invalidProps)).toThrow(CarrierValidationError);
    });
  });

  describe('Status Validation Methods', () => {
    it('should allow label creation from pending status', () => {
      const shipping = Shipping.create(validShippingProps);
      expect(shipping.canCreateLabel()).toBe(true);
    });

    it('should allow pickup confirmation from label created status', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      expect(labelCreated.canPickup()).toBe(true);
    });

    it('should allow marking in transit from picked up status', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      expect(pickedUp.canMarkInTransit()).toBe(true);
    });

    it('should allow delivery attempt from in transit status', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      const inTransit = pickedUp.markInTransit(testUserId);
      expect(inTransit.canAttemptDelivery()).toBe(true);
    });

    it('should allow cancellation from pending and label created status', () => {
      const shipping = Shipping.create(validShippingProps);
      expect(shipping.canCancel()).toBe(true);

      const labelCreated = shipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      expect(labelCreated.canCancel()).toBe(true);
    });

    it('should not allow cancellation after pickup', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      expect(pickedUp.canCancel()).toBe(false);
    });
  });

  describe('Shipping Operations', () => {
    describe('createLabel', () => {
      it('should create label successfully', () => {
        const shipping = Shipping.create(validShippingProps);
        const trackingNumber = 'UPS987654321';
        const labelUrl = 'https://example.com/new-label.pdf';

        const labelCreated = shipping.createLabel(testUserId, trackingNumber, labelUrl, 'Label created');

        expect(labelCreated.status).toBe(ShippingStatus.LABEL_CREATED);
        expect(labelCreated.trackingNumber).toBe(trackingNumber);
        expect(labelCreated.labelUrl).toBe(labelUrl);
        expect(labelCreated.updatedBy).toBe(testUserId);
        expect(labelCreated.updatedAt).toBeInstanceOf(Date);
      });

      it('should add audit trail entry for label creation', () => {
        const shipping = Shipping.create(validShippingProps);
        const trackingNumber = 'UPS987654321';
        const labelUrl = 'https://example.com/new-label.pdf';

        const labelCreated = shipping.createLabel(testUserId, trackingNumber, labelUrl, 'Label created');

        const auditTrail = labelCreated.auditTrail;
        expect(auditTrail).toHaveLength(1);
        expect(auditTrail[0].actionType).toBe(ShippingActionType.CREATE_LABEL);
        expect(auditTrail[0].previousStatus).toBe(ShippingStatus.PENDING);
        expect(auditTrail[0].newStatus).toBe(ShippingStatus.LABEL_CREATED);
        expect(auditTrail[0].performedBy).toBe(testUserId);
        expect(auditTrail[0].notes).toBe('Label created');
        expect(auditTrail[0].metadata?.trackingNumber).toBe(trackingNumber);
        expect(auditTrail[0].metadata?.labelUrl).toBe(labelUrl);
      });

      it('should throw error when creating label from non-pending status', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

        expect(() => labelCreated.createLabel(testUserId, 'UPS456', 'https://label2.pdf')).toThrow(ShippingStatusError);
      });

      it('should throw error with empty tracking number', () => {
        const shipping = Shipping.create(validShippingProps);

        expect(() => shipping.createLabel(testUserId, '', 'https://label.pdf')).toThrow(ShippingValidationError);
      });

      it('should throw error with empty label URL', () => {
        const shipping = Shipping.create(validShippingProps);

        expect(() => shipping.createLabel(testUserId, 'UPS123', '')).toThrow(ShippingValidationError);
      });
    });

    describe('confirmPickup', () => {
      it('should confirm pickup successfully', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickupDate = new Date('2024-02-10T10:00:00Z');

        const pickedUp = labelCreated.confirmPickup(testUserId, pickupDate, 'Package picked up by UPS');

        expect(pickedUp.status).toBe(ShippingStatus.PICKED_UP);
        expect(pickedUp.pickedUpAt).toBe(pickupDate);
        expect(pickedUp.updatedBy).toBe(testUserId);
        expect(pickedUp.updatedAt).toBeInstanceOf(Date);
      });

      it('should confirm pickup with current date when not specified', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

        const pickedUp = labelCreated.confirmPickup(testUserId);

        expect(pickedUp.status).toBe(ShippingStatus.PICKED_UP);
        expect(pickedUp.pickedUpAt).toBeInstanceOf(Date);
      });

      it('should add audit trail entry for pickup confirmation', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickupDate = new Date('2024-02-10T10:00:00Z');

        const pickedUp = labelCreated.confirmPickup(testUserId, pickupDate, 'Package picked up');

        const auditTrail = pickedUp.auditTrail;
        expect(auditTrail).toHaveLength(2);
        expect(auditTrail[1].actionType).toBe(ShippingActionType.CONFIRM_PICKUP);
        expect(auditTrail[1].previousStatus).toBe(ShippingStatus.LABEL_CREATED);
        expect(auditTrail[1].newStatus).toBe(ShippingStatus.PICKED_UP);
        expect(auditTrail[1].metadata?.pickupDate).toBe(pickupDate.toISOString());
      });

      it('should throw error when confirming pickup from non-label-created status', () => {
        const shipping = Shipping.create(validShippingProps);

        expect(() => shipping.confirmPickup(testUserId)).toThrow(ShippingStatusError);
      });
    });

    describe('markInTransit', () => {
      it('should mark shipment as in transit successfully', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const location = 'Phoenix Sorting Facility';

        const inTransit = pickedUp.markInTransit(testUserId, location, 'Package in transit');

        expect(inTransit.status).toBe(ShippingStatus.IN_TRANSIT);
        expect(inTransit.updatedBy).toBe(testUserId);
        expect(inTransit.updatedAt).toBeInstanceOf(Date);
      });

      it('should add tracking event when marking in transit', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const location = 'Phoenix Sorting Facility';

        const inTransit = pickedUp.markInTransit(testUserId, location, 'Package in transit');

        const trackingEvents = inTransit.trackingEvents;
        expect(trackingEvents).toHaveLength(1);
        expect(trackingEvents[0].status).toBe(ShippingStatus.IN_TRANSIT);
        expect(trackingEvents[0].location).toBe(location);
        expect(trackingEvents[0].description).toBe('Package in transit');
        expect(trackingEvents[0].eventType).toBe('SHIPMENT');
      });

      it('should add audit trail entry with tracking event', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);

        const inTransit = pickedUp.markInTransit(testUserId, 'Phoenix', 'In transit');

        const auditTrail = inTransit.auditTrail;
        expect(auditTrail).toHaveLength(3);
        expect(auditTrail[2].actionType).toBe(ShippingActionType.UPDATE_IN_TRANSIT);
        expect(auditTrail[2].trackingEvent).toBeDefined();
        expect(auditTrail[2].metadata?.location).toBe('Phoenix');
      });

      it('should throw error when marking in transit from non-picked-up status', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

        expect(() => labelCreated.markInTransit(testUserId)).toThrow(ShippingStatusError);
      });
    });

    describe('confirmDelivery', () => {
      it('should confirm delivery successfully', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const inTransit = pickedUp.markInTransit(testUserId);
        const deliveryDate = new Date('2024-02-15T14:30:00Z');
        const receivedBy = 'John Doe';

        const delivered = inTransit.confirmDelivery(testUserId, deliveryDate, receivedBy, true, 'Package delivered');

        expect(delivered.status).toBe(ShippingStatus.DELIVERED);
        expect(delivered.actualDeliveryDate).toBe(deliveryDate);
        expect(delivered.deliveredAt).toBe(deliveryDate);
        expect(delivered.updatedBy).toBe(testUserId);
      });

      it('should create delivery attempt record for successful delivery', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const inTransit = pickedUp.markInTransit(testUserId);
        const receivedBy = 'John Doe';

        const delivered = inTransit.confirmDelivery(testUserId, undefined, receivedBy, true);

        const deliveryAttempts = delivered.deliveryAttempts;
        expect(deliveryAttempts).toHaveLength(1);
        expect(deliveryAttempts[0].attemptNumber).toBe(1);
        expect(deliveryAttempts[0].status).toBe('SUCCESSFUL');
        expect(deliveryAttempts[0].receivedBy).toBe(receivedBy);
        expect(deliveryAttempts[0].signatureObtained).toBe(true);
      });

      it('should add tracking event for delivery', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const inTransit = pickedUp.markInTransit(testUserId);
        const receivedBy = 'John Doe';

        const delivered = inTransit.confirmDelivery(testUserId, undefined, receivedBy, true);

        const trackingEvents = delivered.trackingEvents;
        expect(trackingEvents).toHaveLength(2); // In transit + delivered
        expect(trackingEvents[1].status).toBe(ShippingStatus.DELIVERED);
        expect(trackingEvents[1].description).toBe('Package delivered to John Doe');
        expect(trackingEvents[1].eventType).toBe('DELIVERY');
      });

      it('should throw error when signature required but not obtained', () => {
        const shipping = Shipping.create(validShippingProps); // requiresSignature: true
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);
        const inTransit = pickedUp.markInTransit(testUserId);

        expect(() => inTransit.confirmDelivery(testUserId, undefined, 'John Doe', false)).toThrow(
          ShippingValidationError
        );
      });

      it('should throw error when confirming delivery from non-deliverable status', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

        expect(() => labelCreated.confirmDelivery(testUserId)).toThrow(ShippingStatusError);
      });
    });

    describe('cancel', () => {
      it('should cancel shipment successfully', () => {
        const shipping = Shipping.create(validShippingProps);
        const reason = 'Customer requested cancellation';

        const cancelled = shipping.cancel(testUserId, reason, 'Cancelled per customer request');

        expect(cancelled.status).toBe(ShippingStatus.CANCELLED);
        expect(cancelled.updatedBy).toBe(testUserId);
        expect(cancelled.updatedAt).toBeInstanceOf(Date);
      });

      it('should add audit trail entry for cancellation', () => {
        const shipping = Shipping.create(validShippingProps);
        const reason = 'Customer requested cancellation';

        const cancelled = shipping.cancel(testUserId, reason, 'Cancelled per request');

        const auditTrail = cancelled.auditTrail;
        expect(auditTrail).toHaveLength(1);
        expect(auditTrail[0].actionType).toBe(ShippingActionType.CANCEL_SHIPPING);
        expect(auditTrail[0].previousStatus).toBe(ShippingStatus.PENDING);
        expect(auditTrail[0].newStatus).toBe(ShippingStatus.CANCELLED);
        expect(auditTrail[0].metadata?.reason).toBe(reason);
      });

      it('should throw error with empty cancellation reason', () => {
        const shipping = Shipping.create(validShippingProps);

        expect(() => shipping.cancel(testUserId, '')).toThrow(ShippingValidationError);
      });

      it('should throw error when cancelling non-cancellable shipment', () => {
        const shipping = Shipping.create(validShippingProps);
        const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
        const pickedUp = labelCreated.confirmPickup(testUserId);

        expect(() => pickedUp.cancel(testUserId, 'Too late')).toThrow(ShippingStatusError);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should maintain immutability through all operations', () => {
      const originalShipping = Shipping.create(validShippingProps);
      const labelCreated = originalShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      const inTransit = pickedUp.markInTransit(testUserId);
      const delivered = inTransit.confirmDelivery(testUserId, undefined, 'John Doe', true);

      // Original shipping should remain unchanged
      expect(originalShipping.status).toBe(ShippingStatus.PENDING);
      expect(originalShipping.trackingNumber).toBe(validShippingProps.trackingNumber);
      expect(originalShipping.auditTrail).toHaveLength(0);

      // Label created should remain unchanged
      expect(labelCreated.status).toBe(ShippingStatus.LABEL_CREATED);
      expect(labelCreated.pickedUpAt).toBeNull();
      expect(labelCreated.auditTrail).toHaveLength(1);

      // Picked up should remain unchanged
      expect(pickedUp.status).toBe(ShippingStatus.PICKED_UP);
      expect(pickedUp.trackingEvents).toHaveLength(0);
      expect(pickedUp.auditTrail).toHaveLength(2);

      // In transit should remain unchanged
      expect(inTransit.status).toBe(ShippingStatus.IN_TRANSIT);
      expect(inTransit.deliveredAt).toBeNull();
      expect(inTransit.auditTrail).toHaveLength(3);

      // Only delivered should have final state
      expect(delivered.status).toBe(ShippingStatus.DELIVERED);
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
      expect(delivered.auditTrail).toHaveLength(4);
    });

    it('should validate carrier-specific service types', () => {
      // Valid combinations
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.UPS,
          serviceType: ShippingServiceType.GROUND,
        })
      ).not.toThrow();

      expect(() =>
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.DHL,
          serviceType: ShippingServiceType.INTERNATIONAL,
        })
      ).not.toThrow();

      expect(() =>
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.LOCAL_COURIER,
          serviceType: ShippingServiceType.SAME_DAY,
        })
      ).not.toThrow();

      // Invalid combinations
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.DHL,
          serviceType: ShippingServiceType.GROUND,
        })
      ).toThrow(CarrierValidationError);

      expect(() =>
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.LOCAL_COURIER,
          serviceType: ShippingServiceType.INTERNATIONAL,
        })
      ).toThrow(CarrierValidationError);
    });

    it('should enforce package dimension limits', () => {
      // Valid dimensions
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          packageDimensions: {
            length: 50,
            width: 40,
            height: 30,
            weight: 10,
          },
        })
      ).not.toThrow();

      // Exceeds single dimension limit
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          packageDimensions: {
            length: 300, // > 270cm
            width: 20,
            height: 10,
            weight: 5,
          },
        })
      ).toThrow(ShippingValidationError);

      // Exceeds total dimension limit
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          packageDimensions: {
            length: 150,
            width: 150,
            height: 150, // Total > 400cm
            weight: 5,
          },
        })
      ).toThrow(ShippingValidationError);

      // Exceeds weight limit
      expect(() =>
        Shipping.create({
          ...validShippingProps,
          packageDimensions: {
            length: 30,
            width: 20,
            height: 10,
            weight: 80, // > 70kg
          },
        })
      ).toThrow(ShippingValidationError);
    });
  });

  describe('Display Information', () => {
    it('should provide display information correctly', () => {
      const shipping = Shipping.create(validShippingProps);
      const displayInfo = shipping.getDisplayInfo();

      expect(displayInfo.id).toBe(shipping.id);
      expect(displayInfo.orderNumber).toBe(shipping.orderNumber);
      expect(displayInfo.customerName).toBe(shipping.customerName);
      expect(displayInfo.trackingNumber).toBe(shipping.trackingNumber);
      expect(displayInfo.carrier).toBe(shipping.carrier);
      expect(displayInfo.status).toBe(shipping.status);
      expect(displayInfo.estimatedDelivery).toBe(shipping.estimatedDeliveryDate?.toISOString());
      expect(displayInfo.actualDelivery).toBeNull();
      expect(displayInfo.shippingCost).toBe(shipping.shippingCost.format());
      expect(displayInfo.createdAt).toBe(shipping.createdAt.toISOString());
    });

    it('should include actual delivery date when shipment is delivered', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      const inTransit = pickedUp.markInTransit(testUserId);
      const delivered = inTransit.confirmDelivery(testUserId, undefined, 'John Doe', true);

      const displayInfo = delivered.getDisplayInfo();
      expect(displayInfo.actualDelivery).toBe(delivered.actualDeliveryDate!.toISOString());
    });
  });

  describe('Persistence', () => {
    it('should convert to persistence format correctly', () => {
      const shipping = Shipping.create(validShippingProps);
      const persistence = shipping.toPersistence();

      expect(persistence.id).toBe(shipping.id);
      expect(persistence.orderId).toBe(shipping.orderId);
      expect(persistence.orderNumber).toBe(shipping.orderNumber);
      expect(persistence.customerId).toBe(shipping.customerId);
      expect(persistence.customerName).toBe(shipping.customerName);
      expect(persistence.trackingNumber).toBe(shipping.trackingNumber);
      expect(persistence.carrier).toBe(shipping.carrier);
      expect(persistence.serviceType).toBe(shipping.serviceType);
      expect(persistence.priority).toBe(shipping.priority);
      expect(persistence.status).toBe(shipping.status);
      expect(persistence.shippingAddress).toEqual(shipping.shippingAddress);
      expect(persistence.returnAddress).toEqual(shipping.returnAddress);
      expect(persistence.packageLength).toBe(shipping.packageDimensions.length);
      expect(persistence.packageWidth).toBe(shipping.packageDimensions.width);
      expect(persistence.packageHeight).toBe(shipping.packageDimensions.height);
      expect(persistence.packageWeight).toBe(shipping.packageDimensions.weight);
      expect(persistence.volumetricWeight).toBe(shipping.packageDimensions.volumetricWeight);
      expect(persistence.declaredValue).toBe(shipping.declaredValue.decimalAmount * 100);
      expect(persistence.declaredValueCurrency).toBe(shipping.declaredValue.currency);
      expect(persistence.shippingCost).toBe(shipping.shippingCost.decimalAmount * 100);
      expect(persistence.shippingCostCurrency).toBe(shipping.shippingCost.currency);
      expect(persistence.agencyId).toBe(shipping.agencyId);
      expect(persistence.createdBy).toBe(shipping.createdBy);
      expect(persistence.createdAt).toBe(shipping.createdAt);
    });

    it('should restore from persistence format correctly', () => {
      const shipping = Shipping.create(validShippingProps);
      const persistence = shipping.toPersistence();
      const restored = Shipping.fromPersistence(persistence);

      expect(restored.id).toBe(shipping.id);
      expect(restored.orderId).toBe(shipping.orderId);
      expect(restored.orderNumber).toBe(shipping.orderNumber);
      expect(restored.status).toBe(shipping.status);
      expect(restored.declaredValue.decimalAmount).toBe(shipping.declaredValue.decimalAmount);
      expect(restored.declaredValue.currency).toBe(shipping.declaredValue.currency);
      expect(restored.shippingCost.decimalAmount).toBe(shipping.shippingCost.decimalAmount);
      expect(restored.shippingCost.currency).toBe(shipping.shippingCost.currency);
      expect(restored.packageDimensions).toEqual(shipping.packageDimensions);
      expect(restored.shippingAddress).toEqual(shipping.shippingAddress);
      expect(restored.returnAddress).toEqual(shipping.returnAddress);
    });

    it('should preserve state through persistence cycle', () => {
      const shipping = Shipping.create(validShippingProps);
      const labelCreated = shipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);

      const persistence = pickedUp.toPersistence();
      const restored = Shipping.fromPersistence(persistence);

      expect(restored.status).toBe(ShippingStatus.PICKED_UP);
      expect(restored.auditTrail).toHaveLength(2);
      expect(restored.pickedUpAt).toEqual(pickedUp.pickedUpAt);
      expect(restored.updatedBy).toBe(pickedUp.updatedBy);
      expect(restored.updatedAt).toEqual(pickedUp.updatedAt);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      try {
        Shipping.create({
          ...validShippingProps,
          orderId: '',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ShippingValidationError);
        expect((error as ShippingValidationError).message).toBe('Order ID is required');
        expect((error as ShippingValidationError).field).toBe('orderId');
      }
    });

    it('should provide status context in status errors', () => {
      const shipping = Shipping.create(validShippingProps);

      try {
        shipping.confirmPickup(testUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(ShippingStatusError);
        expect((error as ShippingStatusError).currentStatus).toBe(ShippingStatus.PENDING);
      }
    });

    it('should provide carrier context in carrier errors', () => {
      try {
        Shipping.create({
          ...validShippingProps,
          carrier: ShippingCarrier.DHL,
          serviceType: ShippingServiceType.GROUND,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CarrierValidationError);
        expect((error as CarrierValidationError).carrier).toBe(ShippingCarrier.DHL);
      }
    });
  });
});
