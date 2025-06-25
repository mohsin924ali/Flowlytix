import { UpdateShippingTrackingCommand } from '../update-shipping-tracking.command';
import { ShippingStatus } from '../../../../domain/entities/shipping';

describe('UpdateShippingTrackingCommand - Step 3B.2.1', () => {
  describe('validate', () => {
    it('should validate successfully with valid data', () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.IN_TRANSIT,
        'New York, NY',
        'Package is in transit',
        new Date('2024-01-15T10:00:00Z'),
        'system-tracking'
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toEqual([]);
    });

    it('should validate delivery confirmation requirements', () => {
      // Arrange - delivery without required fields
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
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Received by is required for delivery confirmation');
      expect(errors).toContain('Signature obtained status is required for delivery confirmation');
    });

    it('should validate delivery attempt requirements', () => {
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
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Delivery attempt reason is required for attempted delivery');
    });

    it('should validate required fields', () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        '', // Invalid shipping ID
        '', // Invalid tracking number
        ShippingStatus.IN_TRANSIT,
        '', // Invalid location
        '', // Invalid description
        new Date(),
        '' // Invalid updatedBy
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Shipping ID is required');
      expect(errors).toContain('Tracking number is required');
      expect(errors).toContain('Location is required');
      expect(errors).toContain('Description is required');
      expect(errors).toContain('Updated by is required');
    });

    it('should validate future timestamp limits', () => {
      // Arrange - timestamp more than 1 hour in future
      const futureTimestamp = new Date(Date.now() + 2 * 60 * 60 * 1000);
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
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Timestamp cannot be more than 1 hour in the future');
    });
  });

  describe('utility methods', () => {
    it('should identify delivery confirmation', () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.DELIVERED,
        'Customer Address',
        'Package delivered',
        new Date(),
        'system-tracking'
      );

      // Act & Assert
      expect(command.isDeliveryConfirmation()).toBe(true);
      expect(command.isDeliveryAttempt()).toBe(false);
    });

    it('should identify delivery attempt', () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.ATTEMPTED_DELIVERY,
        'Customer Address',
        'Delivery attempted',
        new Date(),
        'system-tracking'
      );

      // Act & Assert
      expect(command.isDeliveryAttempt()).toBe(true);
      expect(command.isDeliveryConfirmation()).toBe(false);
    });

    it('should detect status regression', () => {
      // Arrange
      const command = new UpdateShippingTrackingCommand(
        'shipping-123',
        '1Z123456789',
        ShippingStatus.PICKED_UP,
        'Warehouse',
        'Package picked up',
        new Date(),
        'system-tracking'
      );

      // Act & Assert
      expect(command.isStatusRegression(ShippingStatus.IN_TRANSIT)).toBe(true);
      expect(command.isStatusRegression(ShippingStatus.PENDING)).toBe(false);
    });
  });
});
