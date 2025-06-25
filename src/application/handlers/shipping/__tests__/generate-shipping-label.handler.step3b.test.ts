import { GenerateShippingLabelHandler, GenerateShippingLabelResult } from '../generate-shipping-label.handler';
import { GenerateShippingLabelCommand } from '../../../commands/shipping/generate-shipping-label.command';
import { ShippingService, ShippingLabelResponse } from '../../../../domain/services/shipping.service';
import { ShippingValidationError, ShippingStatusError, ShippingStatus } from '../../../../domain/entities/shipping';

describe('GenerateShippingLabelHandler - Step 3B.3.2', () => {
  let handler: GenerateShippingLabelHandler;
  let mockShippingService: jest.Mocked<ShippingService>;

  const mockLabelResponse: ShippingLabelResponse = {
    shippingId: 'shipping-123',
    trackingNumber: 'UPS1234567890',
    labelUrl: 'https://labels.example.com/UPS1234567890.pdf',
    labelFormat: 'PDF',
    estimatedDeliveryDate: new Date('2024-01-20T10:00:00Z'),
    carrierConfirmation: 'CONF-UPS1234567890',
  };

  const mockInsuredLabelResponse: ShippingLabelResponse = {
    ...mockLabelResponse,
    insuranceNumber: 'INS-UPS1234567890',
  };

  beforeEach(() => {
    mockShippingService = {
      generateShippingLabel: jest.fn(),
    } as any;

    handler = new GenerateShippingLabelHandler(mockShippingService);
  });

  describe('execute', () => {
    it('should generate shipping label successfully with minimal command', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping label generated successfully');
      expect(result.shippingId).toBe('shipping-123');
      expect(result.trackingNumber).toBe('UPS1234567890');
      expect(result.labelUrl).toBe('https://labels.example.com/UPS1234567890.pdf');
      expect(result.metadata?.labelResponse).toBe(mockLabelResponse);
      expect(result.metadata?.carrierConfirmation).toBe('CONF-UPS1234567890');
      expect(result.metadata?.estimatedDeliveryDate).toEqual(new Date('2024-01-20T10:00:00Z'));

      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
      });
    });

    it('should generate shipping label successfully with all optional fields', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        'carrier-account-789',
        true,
        'Handle with care',
        'Rush order - expedite processing'
      );

      mockShippingService.generateShippingLabel.mockResolvedValue(mockInsuredLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping label generated successfully');
      expect(result.shippingId).toBe('shipping-123');
      expect(result.trackingNumber).toBe('UPS1234567890');
      expect(result.labelUrl).toBe('https://labels.example.com/UPS1234567890.pdf');
      expect(result.metadata?.labelResponse).toBe(mockInsuredLabelResponse);
      expect(result.metadata?.carrierConfirmation).toBe('CONF-UPS1234567890');
      expect(result.metadata?.estimatedDeliveryDate).toEqual(new Date('2024-01-20T10:00:00Z'));
      expect(result.metadata?.insuranceNumber).toBe('INS-UPS1234567890');

      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
        carrierAccountId: 'carrier-account-789',
        generateInsuranceLabel: true,
        customInstructions: 'Handle with care',
        notes: 'Rush order - expedite processing',
      });
    });

    it('should handle command validation errors', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        '', // Invalid shipping ID
        '' // Invalid user ID
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Shipping ID is required');
      expect(result.error).toContain('User ID is required');
      expect(mockShippingService.generateShippingLabel).not.toHaveBeenCalled();
    });

    it('should handle shipping validation errors', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockRejectedValue(
        new ShippingValidationError('Invalid shipping address', 'shippingAddress')
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Shipping validation failed');
      expect(result.error).toBe('Invalid shipping address');
    });

    it('should handle shipping status errors', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockRejectedValue(
        new ShippingStatusError('Cannot create label for this shipment', ShippingStatus.DELIVERED)
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid shipping status for label generation');
      expect(result.error).toBe('Cannot create label for this shipment');
    });

    it('should handle generic errors', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockRejectedValue(new Error('Carrier API unavailable'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate shipping label');
      expect(result.error).toBe('Carrier API unavailable');
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockRejectedValue('Unknown error');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate shipping label');
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should include insurance number when present', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        true // Generate insurance label
      );

      mockShippingService.generateShippingLabel.mockResolvedValue(mockInsuredLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.insuranceNumber).toBe('INS-UPS1234567890');
    });

    it('should not include insurance number when not present', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.insuranceNumber).toBeUndefined();
    });

    it('should handle carrier account ID correctly', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456', 'carrier-account-789');

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
        carrierAccountId: 'carrier-account-789',
      });
    });

    it('should handle custom instructions correctly', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        'Handle with extreme care'
      );

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
        customInstructions: 'Handle with extreme care',
      });
    });

    it('should handle notes correctly', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        undefined,
        'Rush order for VIP customer'
      );

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
        notes: 'Rush order for VIP customer',
      });
    });

    it('should handle false insurance flag correctly', async () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        false // Explicitly false
      );

      mockShippingService.generateShippingLabel.mockResolvedValue(mockLabelResponse);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShippingService.generateShippingLabel).toHaveBeenCalledWith({
        shippingId: 'shipping-123',
        userId: 'user-456',
        generateInsuranceLabel: false,
      });
    });
  });
});
