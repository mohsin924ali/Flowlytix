import { Money } from '../../value-objects/money';
import {
  Shipping,
  ShippingStatus,
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingValidationError,
  ShippingStatusError,
  ShippingAddress,
  ShippingProps,
} from '../../entities/shipping';
import {
  ShippingService,
  ShippingServiceError,
  ShippingLabelError,
  ShippingCarrierError,
  ShippingDeliveryError,
  ShippingCostCalculation,
  ShippingLabelRequest,
  BulkShippingRequest,
  ShippingTrackingUpdate,
  DeliveryAttemptRequest,
  DeliveryConfirmationRequest,
} from '../shipping.service';
import { ShippingRepository } from '../../repositories/shipping.repository';

// Mock the repository
const mockShippingRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByOrderId: jest.fn(),
  findByTrackingNumber: jest.fn(),
  findByStatus: jest.fn(),
  findByCarrier: jest.fn(),
  findByAgency: jest.fn(),
  findOverdue: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  findWithFilters: jest.fn(),
  getStatistics: jest.fn(),
  healthCheck: jest.fn(),
} as jest.Mocked<ShippingRepository>;

describe('ShippingService - Step 3A', () => {
  let shippingService: ShippingService;
  const testUserId = 'user-123';
  const testAgencyId = 'agency-456';

  // Test data
  const validShippingAddress: ShippingAddress = {
    name: 'John Doe',
    company: 'Test Company',
    street1: '123 Main St',
    street2: 'Suite 100',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '+1-555-123-4567',
    email: 'john@example.com',
    deliveryInstructions: 'Leave at front door',
    addressType: 'COMMERCIAL',
    isValidated: true,
  };

  const validShippingProps: ShippingProps = {
    orderId: 'order-123',
    orderNumber: 'ORD-001',
    customerId: 'customer-123',
    customerName: 'John Doe',
    shippingAddress: validShippingAddress,
    returnAddress: validShippingAddress,
    carrier: ShippingCarrier.UPS,
    serviceType: ShippingServiceType.GROUND,
    priority: ShippingPriority.NORMAL,
    packageDimensions: {
      length: 30,
      width: 20,
      height: 15,
      weight: 5,
    },
    declaredValue: Money.fromDecimal(100.0, 'USD'),
    shippingCost: Money.fromDecimal(15.99, 'USD'),
    trackingNumber: 'UPS123456789',
    requiresSignature: false,
    isInsured: false,
    agencyId: testAgencyId,
    createdBy: testUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    shippingService = new ShippingService(mockShippingRepository);
  });

  describe('Service Initialization', () => {
    it('should create service with repository dependency', () => {
      expect(shippingService).toBeInstanceOf(ShippingService);
    });
  });

  describe('createShippingWithCalculation', () => {
    it('should create shipping with cost calculation successfully', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      const result = await shippingService.createShippingWithCalculation(validShippingProps, true);

      expect(result.shipping).toBeDefined();
      expect(result.costCalculation).toBeDefined();
      expect(result.costCalculation?.totalCost).toBeInstanceOf(Money);
      expect(result.costCalculation?.estimatedDeliveryDays).toBeGreaterThan(0);
      expect(mockShippingRepository.save).toHaveBeenCalledWith(expect.any(Shipping));
    });

    it('should create shipping without cost calculation when disabled', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      const result = await shippingService.createShippingWithCalculation(validShippingProps, false);

      expect(result.shipping).toBeDefined();
      expect(result.costCalculation).toBeUndefined();
      expect(mockShippingRepository.save).toHaveBeenCalledWith(expect.any(Shipping));
    });

    it('should throw error for invalid shipping address', async () => {
      const invalidProps = {
        ...validShippingProps,
        shippingAddress: {
          ...validShippingAddress,
          street1: '', // Invalid empty street
          city: '',
          state: '',
          zipCode: '',
        },
      };

      await expect(shippingService.createShippingWithCalculation(invalidProps, true)).rejects.toThrow(
        ShippingValidationError
      );
    });

    it('should handle repository save errors', async () => {
      mockShippingRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(shippingService.createShippingWithCalculation(validShippingProps, true)).rejects.toThrow(
        ShippingServiceError
      );
    });

    it('should calculate costs for different carriers', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      // Test UPS
      const upsProps = { ...validShippingProps, carrier: ShippingCarrier.UPS };
      const upsResult = await shippingService.createShippingWithCalculation(upsProps, true);

      // Test FEDEX
      const fedexProps = { ...validShippingProps, carrier: ShippingCarrier.FEDEX };
      const fedexResult = await shippingService.createShippingWithCalculation(fedexProps, true);

      // Test DHL
      const dhlProps = { ...validShippingProps, carrier: ShippingCarrier.DHL };
      const dhlResult = await shippingService.createShippingWithCalculation(dhlProps, true);

      expect(upsResult.costCalculation?.carrierFee.decimalAmount).toBe(5.0);
      expect(fedexResult.costCalculation?.carrierFee.decimalAmount).toBe(6.0);
      expect(dhlResult.costCalculation?.carrierFee.decimalAmount).toBe(8.0);
    });

    it('should calculate costs for different service types', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      // Test OVERNIGHT
      const overnightProps = { ...validShippingProps, serviceType: ShippingServiceType.OVERNIGHT };
      const overnightResult = await shippingService.createShippingWithCalculation(overnightProps, true);

      // Test SAME_DAY
      const sameDayProps = { ...validShippingProps, serviceType: ShippingServiceType.SAME_DAY };
      const sameDayResult = await shippingService.createShippingWithCalculation(sameDayProps, true);

      expect(overnightResult.costCalculation?.serviceFee.getDecimalAmount()).toBe(25.0);
      expect(overnightResult.costCalculation?.estimatedDeliveryDays).toBe(1);
      expect(sameDayResult.costCalculation?.serviceFee.getDecimalAmount()).toBe(50.0);
      expect(sameDayResult.costCalculation?.estimatedDeliveryDays).toBe(1);
    });

    it('should calculate insurance fees for insured shipments', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      const insuredProps = {
        ...validShippingProps,
        isInsured: true,
        insuranceValue: Money.fromDecimal(1000.0, 'USD'),
      };

      const result = await shippingService.createShippingWithCalculation(insuredProps, true);

      expect(result.costCalculation?.insuranceFee.decimalAmount).toBe(20.0); // 2% of $1000
    });

    it('should calculate priority fees', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      // Test URGENT priority
      const urgentProps = { ...validShippingProps, priority: ShippingPriority.URGENT };
      const urgentResult = await shippingService.createShippingWithCalculation(urgentProps, true);

      // Test CRITICAL priority
      const criticalProps = { ...validShippingProps, priority: ShippingPriority.CRITICAL };
      const criticalResult = await shippingService.createShippingWithCalculation(criticalProps, true);

      expect(urgentResult.costCalculation?.priorityFee.decimalAmount).toBe(10.0);
      expect(criticalResult.costCalculation?.priorityFee.decimalAmount).toBe(20.0);
    });
  });

  describe('generateShippingLabel', () => {
    it('should generate shipping label successfully', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      const updatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

      mockShippingRepository.findById.mockResolvedValue(mockShipping);
      mockShippingRepository.save.mockResolvedValue(updatedShipping);

      const request: ShippingLabelRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
        notes: 'Test label generation',
      };

      const result = await shippingService.generateShippingLabel(request);

      expect(result.shippingId).toBe('shipping-123');
      expect(result.trackingNumber).toMatch(/^UPS\d+$/);
      expect(result.labelUrl).toMatch(/^https:\/\/labels\.example\.com\//);
      expect(result.labelFormat).toBe('PDF');
      expect(result.carrierConfirmation).toMatch(/^CONF-/);
      expect(mockShippingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when shipping not found', async () => {
      mockShippingRepository.findById.mockResolvedValue(null);

      const request: ShippingLabelRequest = {
        shippingId: 'non-existent',
        userId: testUserId,
      };

      await expect(shippingService.generateShippingLabel(request)).rejects.toThrow(ShippingLabelError);
    });

    it('should throw error when shipping cannot create label', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123' };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

      mockShippingRepository.findById.mockResolvedValue(labelCreatedShipping);

      const request: ShippingLabelRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
      };

      await expect(shippingService.generateShippingLabel(request)).rejects.toThrow(ShippingLabelError);
    });

    it('should include insurance number for insured shipments', async () => {
      const insuredProps = {
        ...validShippingProps,
        isInsured: true,
        insuranceValue: Money.fromDecimal(500.0, 'USD'),
      };
      const mockShipping = Shipping.create(insuredProps);
      const updatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

      mockShippingRepository.findById.mockResolvedValue(mockShipping);
      mockShippingRepository.save.mockResolvedValue(updatedShipping);

      const request: ShippingLabelRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
      };

      const result = await shippingService.generateShippingLabel(request);

      expect(result.insuranceNumber).toMatch(/^INS-/);
    });
  });

  describe('processBulkShipping', () => {
    it('should process bulk shipping successfully', async () => {
      const shipment1 = { ...validShippingProps, orderId: 'order-1' };
      const shipment2 = { ...validShippingProps, orderId: 'order-2' };

      const mockShipping1 = Shipping.create(shipment1);
      const mockShipping2 = Shipping.create(shipment2);

      mockShippingRepository.save.mockResolvedValueOnce(mockShipping1).mockResolvedValueOnce(mockShipping2);

      const request: BulkShippingRequest = {
        shipments: [shipment1, shipment2],
        userId: testUserId,
        processingOptions: {
          calculateCosts: true,
          generateLabels: false,
        },
      };

      const result = await shippingService.processBulkShipping(request);

      expect(result.totalShipments).toBe(2);
      expect(result.successfulShipments).toBe(2);
      expect(result.failedShipments).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.summary.totalCost.decimalAmount).toBeGreaterThan(0);
      expect(result.summary.carrierBreakdown[ShippingCarrier.UPS]).toBe(2);
    });

    it('should handle partial failures in bulk processing', async () => {
      const shipment1 = { ...validShippingProps, orderId: 'order-1' };
      const shipment2 = {
        ...validShippingProps,
        orderId: 'order-2',
        shippingAddress: { ...validShippingAddress, street1: '' },
      };

      const mockShipping1 = Shipping.create(shipment1);
      mockShippingRepository.save.mockResolvedValueOnce(mockShipping1);

      const request: BulkShippingRequest = {
        shipments: [shipment1, shipment2],
        userId: testUserId,
      };

      const result = await shippingService.processBulkShipping(request);

      expect(result.totalShipments).toBe(2);
      expect(result.successfulShipments).toBe(1);
      expect(result.failedShipments).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
    });

    it('should generate labels when requested', async () => {
      const shipment = { ...validShippingProps };
      const mockShipping = Shipping.create(shipment);
      const updatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');

      mockShippingRepository.save.mockResolvedValue(mockShipping);
      mockShippingRepository.findById.mockResolvedValue(mockShipping);
      mockShippingRepository.save.mockResolvedValue(updatedShipping);

      const request: BulkShippingRequest = {
        shipments: [shipment],
        userId: testUserId,
        processingOptions: {
          generateLabels: true,
        },
      };

      const result = await shippingService.processBulkShipping(request);

      expect(result.results[0].trackingNumber).toMatch(/^UPS\d+$/);
    });
  });

  describe('updateShippingTracking', () => {
    it('should update shipping tracking successfully', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123456789' };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);

      mockShippingRepository.findById.mockResolvedValue(pickedUpShipping);
      mockShippingRepository.save.mockResolvedValue(pickedUpShipping);

      const update: ShippingTrackingUpdate = {
        shippingId: 'shipping-123',
        trackingNumber: 'UPS123456789',
        status: ShippingStatus.IN_TRANSIT,
        location: 'New York, NY',
        description: 'Package in transit',
        timestamp: new Date(),
        carrierCode: 'UPS',
        facilityCode: 'NYC01',
      };

      const result = await shippingService.updateShippingTracking(update);

      expect(result).toBeDefined();
      expect(mockShippingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when shipping not found', async () => {
      mockShippingRepository.findById.mockResolvedValue(null);

      const update: ShippingTrackingUpdate = {
        shippingId: 'non-existent',
        trackingNumber: 'UPS123456789',
        status: ShippingStatus.IN_TRANSIT,
        description: 'Package in transit',
        timestamp: new Date(),
      };

      await expect(shippingService.updateShippingTracking(update)).rejects.toThrow(ShippingServiceError);
    });

    it('should throw error for tracking number mismatch', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123456789' };
      const mockShipping = Shipping.create(shippingProps);

      mockShippingRepository.findById.mockResolvedValue(mockShipping);

      const update: ShippingTrackingUpdate = {
        shippingId: 'shipping-123',
        trackingNumber: 'FEDEX987654321', // Different tracking number
        status: ShippingStatus.IN_TRANSIT,
        description: 'Package in transit',
        timestamp: new Date(),
      };

      await expect(shippingService.updateShippingTracking(update)).rejects.toThrow(ShippingServiceError);
    });

    it('should handle different status updates correctly', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123456789' };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);
      const inTransitShipping = pickedUpShipping.markInTransit(testUserId);
      const outForDeliveryShipping = inTransitShipping.markOutForDelivery(testUserId);

      mockShippingRepository.findById.mockResolvedValue(outForDeliveryShipping);
      mockShippingRepository.save.mockResolvedValue(outForDeliveryShipping);

      // Test DELIVERED status
      const deliveredUpdate: ShippingTrackingUpdate = {
        shippingId: 'shipping-123',
        trackingNumber: 'UPS123456789',
        status: ShippingStatus.DELIVERED,
        description: 'Package delivered',
        timestamp: new Date(),
      };

      const result = await shippingService.updateShippingTracking(deliveredUpdate);
      expect(result).toBeDefined();

      // Test FAILED status
      const failedUpdate: ShippingTrackingUpdate = {
        shippingId: 'shipping-123',
        trackingNumber: 'UPS123456789',
        status: ShippingStatus.FAILED,
        description: 'Delivery failed',
        timestamp: new Date(),
      };

      mockShippingRepository.findById.mockResolvedValue(inTransitShipping);
      await shippingService.updateShippingTracking(failedUpdate);
    });
  });

  describe('attemptDelivery', () => {
    it('should attempt delivery successfully', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123456789' };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);
      const inTransitShipping = pickedUpShipping.markInTransit(testUserId);

      mockShippingRepository.findById.mockResolvedValue(inTransitShipping);
      mockShippingRepository.save.mockResolvedValue(inTransitShipping);

      const request: DeliveryAttemptRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
        attemptReason: 'Customer not available',
        nextAttemptDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: 'Will retry tomorrow',
      };

      const result = await shippingService.attemptDelivery(request);

      expect(result).toBeDefined();
      expect(mockShippingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when shipping not found', async () => {
      mockShippingRepository.findById.mockResolvedValue(null);

      const request: DeliveryAttemptRequest = {
        shippingId: 'non-existent',
        userId: testUserId,
      };

      await expect(shippingService.attemptDelivery(request)).rejects.toThrow(ShippingDeliveryError);
    });

    it('should handle status errors', async () => {
      const mockShipping = Shipping.create(validShippingProps); // PENDING status
      mockShippingRepository.findById.mockResolvedValue(mockShipping);

      const request: DeliveryAttemptRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
      };

      await expect(shippingService.attemptDelivery(request)).rejects.toThrow(ShippingDeliveryError);
    });
  });

  describe('confirmDelivery', () => {
    it('should confirm delivery successfully', async () => {
      const shippingProps = { ...validShippingProps, trackingNumber: 'UPS123456789' };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123456789', 'https://label.pdf');
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);
      const inTransitShipping = pickedUpShipping.markInTransit(testUserId);

      mockShippingRepository.findById.mockResolvedValue(inTransitShipping);
      mockShippingRepository.save.mockResolvedValue(inTransitShipping);

      const request: DeliveryConfirmationRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
        deliveryDate: new Date(),
        receivedBy: 'John Doe',
        signatureObtained: true,
        notes: 'Package delivered successfully',
      };

      const result = await shippingService.confirmDelivery(request);

      expect(result).toBeDefined();
      expect(mockShippingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when shipping not found', async () => {
      mockShippingRepository.findById.mockResolvedValue(null);

      const request: DeliveryConfirmationRequest = {
        shippingId: 'non-existent',
        userId: testUserId,
      };

      await expect(shippingService.confirmDelivery(request)).rejects.toThrow(ShippingDeliveryError);
    });

    it('should handle validation errors', async () => {
      const shippingProps = { ...validShippingProps, requiresSignature: true };
      const mockShipping = Shipping.create(shippingProps);
      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);
      const inTransitShipping = pickedUpShipping.markInTransit(testUserId);

      mockShippingRepository.findById.mockResolvedValue(inTransitShipping);

      const request: DeliveryConfirmationRequest = {
        shippingId: 'shipping-123',
        userId: testUserId,
        signatureObtained: false, // Required but not obtained
      };

      await expect(shippingService.confirmDelivery(request)).rejects.toThrow(ShippingDeliveryError);
    });
  });

  describe('getShippingAnalytics', () => {
    it('should generate shipping analytics successfully', async () => {
      const deliveredShipping = Shipping.create(validShippingProps);
      const labelCreated = deliveredShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      const pickedUp = labelCreated.confirmPickup(testUserId);
      const inTransit = pickedUp.markInTransit(testUserId);
      const delivered = inTransit.confirmDelivery(testUserId, new Date(), 'John Doe', true);

      const failedShipping = Shipping.create({
        ...validShippingProps,
        orderId: 'order-2',
        orderNumber: 'ORD-002',
      });

      mockShippingRepository.findByAgency.mockResolvedValue([delivered, failedShipping]);

      const analytics = await shippingService.getShippingAnalytics(testAgencyId);

      expect(analytics.totalShipments).toBe(2);
      expect(analytics.totalCost.getDecimalAmount()).toBeGreaterThan(0);
      expect(analytics.statusBreakdown[ShippingStatus.DELIVERED]).toBe(1);
      expect(analytics.statusBreakdown[ShippingStatus.PENDING]).toBe(1);
      expect(analytics.carrierBreakdown[ShippingCarrier.UPS]).toBe(2);
      expect(analytics.deliveryPerformance.averageDeliveryDays).toBeGreaterThan(0);
    });

    it('should handle empty results', async () => {
      mockShippingRepository.findByAgency.mockResolvedValue([]);

      const analytics = await shippingService.getShippingAnalytics(testAgencyId);

      expect(analytics.totalShipments).toBe(0);
      expect(analytics.totalCost.getDecimalAmount()).toBe(0);
      expect(analytics.deliveryPerformance.averageDeliveryDays).toBe(0);
    });

    it('should handle date range filtering', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      mockShippingRepository.findByAgency.mockResolvedValue([]);

      await shippingService.getShippingAnalytics(testAgencyId, dateRange);

      expect(mockShippingRepository.findByAgency).toHaveBeenCalledWith(testAgencyId, dateRange);
    });

    it('should calculate delivery performance metrics', async () => {
      const onTimeShipping = Shipping.create(validShippingProps);
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + 5);

      // Mock shipping with estimated delivery date
      const shippingWithEstimate = {
        ...onTimeShipping,
        estimatedDeliveryDate: estimatedDate,
        actualDeliveryDate: new Date(), // Delivered early
        status: ShippingStatus.DELIVERED,
      } as any;

      const lateShipping = {
        ...onTimeShipping,
        estimatedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        actualDeliveryDate: new Date(), // Delivered today (late)
        status: ShippingStatus.DELIVERED,
      } as any;

      const failedShipping = {
        ...onTimeShipping,
        status: ShippingStatus.FAILED,
      } as any;

      mockShippingRepository.findByAgency.mockResolvedValue([shippingWithEstimate, lateShipping, failedShipping]);

      const analytics = await shippingService.getShippingAnalytics(testAgencyId);

      expect(analytics.deliveryPerformance.onTimeDeliveries).toBe(1);
      expect(analytics.deliveryPerformance.lateDeliveries).toBe(1);
      expect(analytics.deliveryPerformance.failedDeliveries).toBe(1);
    });

    it('should handle repository errors', async () => {
      mockShippingRepository.findByAgency.mockRejectedValue(new Error('Database error'));

      await expect(shippingService.getShippingAnalytics(testAgencyId)).rejects.toThrow(ShippingServiceError);
    });
  });

  describe('Error Handling', () => {
    it('should provide proper error context in ShippingServiceError', () => {
      const context = { orderId: 'order-123', userId: testUserId };
      const error = new ShippingServiceError('Test error', 'TEST_ERROR', context);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual(context);
      expect(error.name).toBe('ShippingServiceError');
    });

    it('should provide proper error context in ShippingLabelError', () => {
      const context = { shippingId: 'shipping-123' };
      const error = new ShippingLabelError('Label error', context);

      expect(error.message).toBe('Label error');
      expect(error.code).toBe('SHIPPING_LABEL_ERROR');
      expect(error.context).toEqual(context);
      expect(error.name).toBe('ShippingLabelError');
    });

    it('should provide proper error context in ShippingCarrierError', () => {
      const context = { carrier: ShippingCarrier.UPS };
      const error = new ShippingCarrierError('Carrier error', context);

      expect(error.message).toBe('Carrier error');
      expect(error.code).toBe('SHIPPING_CARRIER_ERROR');
      expect(error.context).toEqual(context);
      expect(error.name).toBe('ShippingCarrierError');
    });

    it('should provide proper error context in ShippingDeliveryError', () => {
      const context = { deliveryAttempt: 3 };
      const error = new ShippingDeliveryError('Delivery error', context);

      expect(error.message).toBe('Delivery error');
      expect(error.code).toBe('SHIPPING_DELIVERY_ERROR');
      expect(error.context).toEqual(context);
      expect(error.name).toBe('ShippingDeliveryError');
    });
  });

  describe('Cost Calculation Details', () => {
    it('should include carrier rules in cost calculation', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      const result = await shippingService.createShippingWithCalculation(validShippingProps, true);

      expect(result.costCalculation?.carrierRules).toEqual([
        'Maximum package weight: 70kg',
        'Maximum dimensions: 274cm length + girth',
        'Signature required for packages over $500',
      ]);
    });

    it('should calculate correct estimated delivery days for service types', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);

      // Test STANDARD service
      const standardProps = { ...validShippingProps, serviceType: ShippingServiceType.STANDARD };
      const standardResult = await shippingService.createShippingWithCalculation(standardProps, true);

      // Test INTERNATIONAL service
      const intlProps = { ...validShippingProps, serviceType: ShippingServiceType.INTERNATIONAL };
      const intlResult = await shippingService.createShippingWithCalculation(intlProps, true);

      expect(standardResult.costCalculation?.estimatedDeliveryDays).toBe(7);
      expect(intlResult.costCalculation?.estimatedDeliveryDays).toBe(5); // Default
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete shipping lifecycle', async () => {
      const mockShipping = Shipping.create(validShippingProps);
      mockShippingRepository.save.mockResolvedValue(mockShipping);
      mockShippingRepository.findById.mockResolvedValue(mockShipping);

      // 1. Create shipping with calculation
      const createResult = await shippingService.createShippingWithCalculation(validShippingProps, true);
      expect(createResult.shipping).toBeDefined();
      expect(createResult.costCalculation).toBeDefined();

      // 2. Generate label
      const labelRequest: ShippingLabelRequest = {
        shippingId: createResult.shipping.id,
        userId: testUserId,
      };

      const labelCreatedShipping = mockShipping.createLabel(testUserId, 'UPS123', 'https://label.pdf');
      mockShippingRepository.findById.mockResolvedValue(mockShipping);
      mockShippingRepository.save.mockResolvedValue(labelCreatedShipping);

      const labelResult = await shippingService.generateShippingLabel(labelRequest);
      expect(labelResult.trackingNumber).toBeDefined();

      // 3. Update tracking
      const pickedUpShipping = labelCreatedShipping.confirmPickup(testUserId);
      mockShippingRepository.findById.mockResolvedValue(pickedUpShipping);
      mockShippingRepository.save.mockResolvedValue(pickedUpShipping);

      const trackingUpdate: ShippingTrackingUpdate = {
        shippingId: createResult.shipping.id,
        trackingNumber: labelResult.trackingNumber,
        status: ShippingStatus.IN_TRANSIT,
        description: 'Package in transit',
        timestamp: new Date(),
      };

      const trackingResult = await shippingService.updateShippingTracking(trackingUpdate);
      expect(trackingResult).toBeDefined();

      // 4. Confirm delivery
      const inTransitShipping = pickedUpShipping.markInTransit(testUserId);
      mockShippingRepository.findById.mockResolvedValue(inTransitShipping);

      const deliveryRequest: DeliveryConfirmationRequest = {
        shippingId: createResult.shipping.id,
        userId: testUserId,
        receivedBy: 'John Doe',
        signatureObtained: true,
      };

      const deliveryResult = await shippingService.confirmDelivery(deliveryRequest);
      expect(deliveryResult).toBeDefined();
    });
  });
});
