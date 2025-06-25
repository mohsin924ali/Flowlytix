import { UpdateShippingTrackingHandler, UpdateShippingTrackingResult } from '../update-shipping-tracking.handler';
import { UpdateShippingTrackingCommand } from '../../../commands/shipping/update-shipping-tracking.command';
import { ShippingService } from '../../../../domain/services/shipping.service';
import {
  Shipping,
  ShippingStatus,
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingValidationError,
  ShippingStatusError,
} from '../../../../domain/entities/shipping';
import { Money } from '../../../../domain/value-objects/money';

describe('UpdateShippingTrackingHandler - Step 3B.2.1', () => {
  let handler: UpdateShippingTrackingHandler;
  let mockShippingService: jest.Mocked<ShippingService>;

  const mockShippingAddress = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '+1-555-0123',
    email: 'customer@example.com',
    addressType: 'RESIDENTIAL' as const,
    isValidated: true,
  };

  const mockReturnAddress = {
    name: 'Company Returns',
    street1: '456 Business Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10002',
    country: 'US',
    phone: '+1-555-0456',
    email: 'returns@company.com',
    addressType: 'COMMERCIAL' as const,
    isValidated: true,
  };

  const mockPackageDimensions = {
    length: 10,
    width: 8,
    height: 6,
    weight: 2.5,
  };

  const mockShipping = Shipping.create({
    orderId: 'order-123',
    orderNumber: 'ORD-123',
    customerId: 'customer-456',
    customerName: 'John Doe',
    shippingAddress: mockShippingAddress,
    returnAddress: mockReturnAddress,
    carrier: ShippingCarrier.UPS,
    serviceType: ShippingServiceType.GROUND,
    priority: ShippingPriority.NORMAL,
    packageDimensions: mockPackageDimensions,
    declaredValue: Money.fromDecimal(100, 'USD'),
    shippingCost: Money.fromDecimal(15, 'USD'),
    requiresSignature: false,
    isInsured: true,
    agencyId: 'agency-789',
    createdBy: 'user-123',
    trackingNumber: '1Z123456789',
  });

  beforeEach(() => {
    mockShippingService = {
      updateShippingTracking: jest.fn(),
    } as any;

    handler = new UpdateShippingTrackingHandler(mockShippingService);
  });

  describe('execute', () => {
    it('should update shipping tracking successfully with valid command', async () => {
      // Arrange
      const timestamp = new Date('2024-01-15T10:00:00Z');
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        timestamp,
        'system-tracking'
      );

      // Mock the service to return a shipping in IN_TRANSIT status
      const updatedShipping = {
        ...mockShipping,
        id: 'shipping-123',
        status: ShippingStatus.IN_TRANSIT,
        trackingNumber: '1Z123456789',
      };
      mockShippingService.updateShippingTracking.mockResolvedValue(updatedShipping as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping tracking updated successfully');
      expect(result.shippingId).toBe(updatedShipping.id);
      expect(result.trackingNumber).toBe('1Z123456789');
      expect(result.metadata?.shipping).toBe(updatedShipping);
      expect(result.metadata?.trackingUpdate).toEqual({
        previousStatus: ShippingStatus.IN_TRANSIT,
        newStatus: ShippingStatus.IN_TRANSIT,
        location: 'New York, NY',
        timestamp,
      });
      expect(mockShippingService.updateShippingTracking).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        trackingNumber: '1Z123456789',
        status: ShippingStatus.IN_TRANSIT,
        location: 'New York, NY',
        description: 'Package is in transit',
        timestamp,
      });
    });

    it('should handle command validation errors', async () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        '', // Invalid - empty shipping ID
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        new Date(),
        'system-tracking'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Shipping ID is required');
      expect(result.metadata?.errors).toBeDefined();
      expect(mockShippingService.updateShippingTracking).not.toHaveBeenCalled();
    });

    it('should handle delivery confirmation with signature', async () => {
      // Arrange
      const timestamp = new Date('2024-01-15T14:00:00Z');
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.DELIVERED,
        'Customer Address',
        'Package delivered successfully',
        timestamp,
        'system-tracking',
        undefined, // carrierCode
        undefined, // facilityCode
        undefined, // nextExpectedUpdate
        undefined, // deliveryAttemptReason
        'John Doe', // receivedBy
        true // signatureObtained
      );

      // Mock the service to return a delivered shipping
      const deliveredShipping = {
        ...mockShipping,
        id: 'shipping-123',
        status: ShippingStatus.DELIVERED,
        trackingNumber: '1Z123456789',
      };
      mockShippingService.updateShippingTracking.mockResolvedValue(deliveredShipping as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping tracking updated successfully');
      expect(result.metadata?.deliveryConfirmation).toEqual({
        deliveredAt: timestamp,
        receivedBy: 'John Doe',
        signatureObtained: true,
      });
    });

    it('should handle delivery attempt with reason', async () => {
      // Arrange
      const timestamp = new Date('2024-01-15T16:00:00Z');
      const nextAttempt = new Date('2024-01-16T10:00:00Z');
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.ATTEMPTED_DELIVERY,
        'Customer Address',
        'Delivery attempted - customer not available',
        timestamp,
        'system-tracking',
        undefined, // carrierCode
        undefined, // facilityCode
        nextAttempt, // nextExpectedUpdate
        'Customer not available' // deliveryAttemptReason
      );

      // Mock the service to return an attempted delivery shipping
      const attemptedShipping = {
        ...mockShipping,
        id: 'shipping-123',
        status: ShippingStatus.ATTEMPTED_DELIVERY,
        trackingNumber: '1Z123456789',
        deliveryAttempts: [{ attemptNumber: 1, attemptDate: timestamp, status: 'ATTEMPTED' as const }],
      };
      mockShippingService.updateShippingTracking.mockResolvedValue(attemptedShipping as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping tracking updated successfully');
      expect(result.metadata?.deliveryAttempt).toEqual({
        attemptReason: 'Customer not available',
        nextAttemptDate: nextAttempt,
        totalAttempts: 2, // Mock data has 1 attempt + this attempt = 2
      });
    });

    it('should handle tracking update with carrier and facility codes', async () => {
      // Arrange
      const timestamp = new Date('2024-01-15T12:00:00Z');
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.OUT_FOR_DELIVERY,
        'Local Delivery Hub',
        'Out for delivery',
        timestamp,
        'system-tracking',
        'UPS', // carrierCode
        'NYC01' // facilityCode
      );

      // Mock the service to return an out-for-delivery shipping
      const outForDeliveryShipping = {
        ...mockShipping,
        id: 'shipping-123',
        status: ShippingStatus.OUT_FOR_DELIVERY,
        trackingNumber: '1Z123456789',
      };
      mockShippingService.updateShippingTracking.mockResolvedValue(outForDeliveryShipping as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShippingService.updateShippingTracking).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        trackingNumber: '1Z123456789',
        status: ShippingStatus.OUT_FOR_DELIVERY,
        location: 'Local Delivery Hub',
        description: 'Out for delivery',
        timestamp,
        carrierCode: 'UPS',
        facilityCode: 'NYC01',
      });
    });

    it('should handle shipping validation errors', async () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        new Date(),
        'system-tracking'
      );

      mockShippingService.updateShippingTracking.mockRejectedValue(
        new ShippingValidationError('Invalid tracking number')
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Shipping validation failed');
      expect(result.error).toBe('Invalid tracking number');
    });

    it('should handle shipping status errors', async () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.DELIVERED,
        'Customer Address',
        'Package delivered',
        new Date(),
        'system-tracking',
        undefined, // carrierCode
        undefined, // facilityCode
        undefined, // nextExpectedUpdate
        undefined, // deliveryAttemptReason
        'John Doe', // receivedBy - required for delivery
        true // signatureObtained - required for delivery
      );

      mockShippingService.updateShippingTracking.mockRejectedValue(
        new ShippingStatusError('Cannot deliver from current status', ShippingStatus.PENDING)
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid status transition');
      expect(result.error).toBe('Cannot deliver from current status');
    });

    it('should handle generic errors', async () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        new Date(),
        'system-tracking'
      );

      mockShippingService.updateShippingTracking.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update shipping tracking');
      expect(result.error).toBe('Database connection failed');
    });

    it('should validate future timestamp limits', async () => {
      // Arrange - timestamp more than 1 hour in future
      const futureTimestamp = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        futureTimestamp,
        'system-tracking'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Timestamp cannot be more than 1 hour in the future');
    });

    it('should validate delivery confirmation requirements', async () => {
      // Arrange - delivery status without required fields
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.DELIVERED,
        'Customer Address',
        'Package delivered',
        new Date(),
        'system-tracking'
        // Missing receivedBy and signatureObtained
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Received by is required for delivery confirmation');
    });

    it('should validate delivery attempt requirements', async () => {
      // Arrange - attempted delivery without reason
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.ATTEMPTED_DELIVERY,
        'Customer Address',
        'Delivery attempted',
        new Date(),
        'system-tracking'
        // Missing deliveryAttemptReason
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Delivery attempt reason is required for attempted delivery');
    });
  });
});
