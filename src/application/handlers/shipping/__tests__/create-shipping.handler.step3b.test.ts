import { CreateShippingHandler, CreateShippingResult } from '../create-shipping.handler';
import { CreateShippingCommand } from '../../../commands/shipping/create-shipping.command';
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

describe('CreateShippingHandler - Step 3B.1', () => {
  let handler: CreateShippingHandler;
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
  });

  beforeEach(() => {
    mockShippingService = {
      createShippingWithCalculation: jest.fn(),
      generateShippingLabel: jest.fn(),
    } as any;

    handler = new CreateShippingHandler(mockShippingService);
  });

  describe('execute', () => {
    it('should create shipping successfully with valid command', async () => {
      // Arrange
      const command = new CreateShippingCommand(
        'order-123',
        'ORD-123',
        'customer-456',
        'John Doe',
        mockShippingAddress,
        mockReturnAddress,
        ShippingCarrier.UPS,
        ShippingServiceType.GROUND,
        ShippingPriority.NORMAL,
        mockPackageDimensions,
        Money.fromDecimal(100, 'USD'),
        Money.fromDecimal(15, 'USD'),
        false,
        true,
        'agency-789',
        'user-123'
      );

      const mockCostCalculation = {
        baseCost: Money.fromDecimal(12, 'USD'),
        carrierFee: Money.fromDecimal(2, 'USD'),
        serviceFee: Money.fromDecimal(1, 'USD'),
        insuranceFee: Money.fromDecimal(0, 'USD'),
        priorityFee: Money.fromDecimal(0, 'USD'),
        surcharges: [],
        discounts: [],
        totalCost: Money.fromDecimal(15, 'USD'),
        estimatedDeliveryDate: new Date('2024-01-15'),
        estimatedDeliveryDays: 3,
        carrierRules: {
          maxWeight: 70,
          maxDimensions: { length: 100, width: 100, height: 100 },
          restrictedItems: [],
          serviceAreas: ['US'],
        },
      };

      const createResult = {
        shipping: mockShipping,
        costCalculation: mockCostCalculation,
      };

      mockShippingService.createShippingWithCalculation.mockResolvedValue(createResult);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Shipping created successfully');
      expect(result.shippingId).toBe(mockShipping.id);
      expect(result.metadata?.shipping).toBe(mockShipping);
      expect(result.metadata?.costCalculation).toBe(mockCostCalculation);
      expect(mockShippingService.createShippingWithCalculation).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          orderNumber: 'ORD-123',
          customerId: 'customer-456',
          carrier: ShippingCarrier.UPS,
          serviceType: ShippingServiceType.GROUND,
        }),
        true
      );
    });

    it('should handle command validation errors', async () => {
      // Arrange
      const command = new CreateShippingCommand(
        '', // Invalid - empty
        'ORD-123',
        'customer-456',
        'John Doe',
        mockShippingAddress,
        mockReturnAddress,
        ShippingCarrier.UPS,
        ShippingServiceType.GROUND,
        ShippingPriority.NORMAL,
        mockPackageDimensions,
        Money.fromDecimal(100, 'USD'),
        Money.fromDecimal(15, 'USD'),
        false,
        true,
        'agency-789',
        'user-123'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Command validation failed');
      expect(result.error).toContain('Order ID is required');
      expect(result.metadata?.errors).toBeDefined();
      expect(mockShippingService.createShippingWithCalculation).not.toHaveBeenCalled();
    });

    it('should handle shipping validation errors', async () => {
      // Arrange
      const command = new CreateShippingCommand(
        'order-123',
        'ORD-123',
        'customer-456',
        'John Doe',
        mockShippingAddress,
        mockReturnAddress,
        ShippingCarrier.UPS,
        ShippingServiceType.GROUND,
        ShippingPriority.NORMAL,
        mockPackageDimensions,
        Money.fromDecimal(100, 'USD'),
        Money.fromDecimal(15, 'USD'),
        false,
        true,
        'agency-789',
        'user-123'
      );

      mockShippingService.createShippingWithCalculation.mockRejectedValue(
        new ShippingValidationError('Invalid package dimensions')
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Shipping validation failed');
      expect(result.error).toBe('Invalid package dimensions');
    });

    it('should handle generic errors', async () => {
      // Arrange
      const command = new CreateShippingCommand({
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
      });

      mockShippingService.createShippingWithCalculation.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create shipping');
      expect(result.error).toBe('Database connection failed');
    });
  });
});
