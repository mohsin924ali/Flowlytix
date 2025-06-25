/**
 * Shipping Repository Interface - Step 3A.2
 *
 * Repository interface for shipping persistence operations.
 * Defines contracts for shipping data access following repository pattern
 * with comprehensive querying capabilities for shipping management.
 *
 * Business Operations:
 * - Basic CRUD operations for shipping entities
 * - Query by order and customer relationships
 * - Status-based filtering and tracking
 * - Carrier and service type queries
 * - Date range and delivery status queries
 * - Audit trail and tracking history access
 *
 * @domain Order Management - Shipping Operations
 * @pattern Repository
 * @version 1.0.0 - Step 3A: Shipping Domain Layer
 */

import { Shipping, ShippingStatus, ShippingCarrier, ShippingServiceType } from '../entities/shipping';

/**
 * Shipping search criteria interface
 */
export interface ShippingSearchCriteria {
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly customerId?: string;
  readonly trackingNumber?: string;
  readonly carrier?: ShippingCarrier;
  readonly serviceType?: ShippingServiceType;
  readonly status?: ShippingStatus;
  readonly statuses?: ShippingStatus[];
  readonly agencyId?: string;
  readonly createdBy?: string;
  readonly createdDateFrom?: Date;
  readonly createdDateTo?: Date;
  readonly estimatedDeliveryFrom?: Date;
  readonly estimatedDeliveryTo?: Date;
  readonly actualDeliveryFrom?: Date;
  readonly actualDeliveryTo?: Date;
  readonly requiresSignature?: boolean;
  readonly isInsured?: boolean;
}

/**
 * Shipping query options interface
 */
export interface ShippingQueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'createdAt' | 'updatedAt' | 'estimatedDeliveryDate' | 'actualDeliveryDate' | 'orderNumber';
  readonly sortOrder?: 'ASC' | 'DESC';
  readonly includeAuditTrail?: boolean;
  readonly includeTrackingEvents?: boolean;
  readonly includeDeliveryAttempts?: boolean;
}

/**
 * Shipping summary for reporting interface
 */
export interface ShippingSummaryQuery {
  readonly agencyId?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly carrier?: ShippingCarrier;
  readonly status?: ShippingStatus;
}

/**
 * Shipping statistics interface
 */
export interface ShippingStatistics {
  readonly totalShipments: number;
  readonly pendingShipments: number;
  readonly inTransitShipments: number;
  readonly deliveredShipments: number;
  readonly failedShipments: number;
  readonly cancelledShipments: number;
  readonly averageDeliveryTime: number; // in hours
  readonly onTimeDeliveryRate: number; // percentage
  readonly carrierBreakdown: Record<ShippingCarrier, number>;
  readonly serviceTypeBreakdown: Record<ShippingServiceType, number>;
  readonly totalShippingCost: number;
  readonly averageShippingCost: number;
}

/**
 * Shipping tracking summary interface
 */
export interface ShippingTrackingSummary {
  readonly id: string;
  readonly orderNumber: string;
  readonly trackingNumber: string | null;
  readonly carrier: ShippingCarrier;
  readonly status: ShippingStatus;
  readonly customerName: string;
  readonly estimatedDeliveryDate: Date | null;
  readonly actualDeliveryDate: Date | null;
  readonly lastTrackingUpdate: Date | null;
  readonly deliveryAttempts: number;
  readonly requiresSignature: boolean;
  readonly isInsured: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

/**
 * Bulk shipping operation result interface
 */
export interface BulkShippingResult {
  readonly successful: number;
  readonly failed: number;
  readonly errors: Array<{
    readonly shippingId: string;
    readonly error: string;
  }>;
}

/**
 * Shipping Repository Interface
 */
export interface ShippingRepository {
  /**
   * Find shipping by ID
   * @param id - Shipping ID
   * @returns Promise resolving to shipping entity or null if not found
   */
  findById(id: string): Promise<Shipping | null>;

  /**
   * Find shipping by tracking number
   * @param trackingNumber - Tracking number
   * @returns Promise resolving to shipping entity or null if not found
   */
  findByTrackingNumber(trackingNumber: string): Promise<Shipping | null>;

  /**
   * Find shipping by order ID
   * @param orderId - Order ID
   * @returns Promise resolving to shipping entity or null if not found
   */
  findByOrderId(orderId: string): Promise<Shipping | null>;

  /**
   * Find multiple shipments by order IDs
   * @param orderIds - Array of order IDs
   * @returns Promise resolving to array of shipping entities
   */
  findByOrderIds(orderIds: string[]): Promise<Shipping[]>;

  /**
   * Find shipments by customer ID
   * @param customerId - Customer ID
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  findByCustomerId(customerId: string, options?: ShippingQueryOptions): Promise<Shipping[]>;

  /**
   * Search shipments by criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  search(criteria: ShippingSearchCriteria, options?: ShippingQueryOptions): Promise<Shipping[]>;

  /**
   * Count shipments by criteria
   * @param criteria - Search criteria
   * @returns Promise resolving to count
   */
  count(criteria: ShippingSearchCriteria): Promise<number>;

  /**
   * Find shipments by status
   * @param status - Shipping status
   * @param agencyId - Optional agency ID filter
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  findByStatus(status: ShippingStatus, agencyId?: string, options?: ShippingQueryOptions): Promise<Shipping[]>;

  /**
   * Find shipments by multiple statuses
   * @param statuses - Array of shipping statuses
   * @param agencyId - Optional agency ID filter
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  findByStatuses(statuses: ShippingStatus[], agencyId?: string, options?: ShippingQueryOptions): Promise<Shipping[]>;

  /**
   * Find shipments by carrier
   * @param carrier - Shipping carrier
   * @param agencyId - Optional agency ID filter
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  findByCarrier(carrier: ShippingCarrier, agencyId?: string, options?: ShippingQueryOptions): Promise<Shipping[]>;

  /**
   * Find shipments requiring pickup
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findPendingPickup(agencyId?: string): Promise<Shipping[]>;

  /**
   * Find shipments in transit
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findInTransit(agencyId?: string): Promise<Shipping[]>;

  /**
   * Find shipments out for delivery
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findOutForDelivery(agencyId?: string): Promise<Shipping[]>;

  /**
   * Find overdue shipments
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findOverdue(agencyId?: string): Promise<Shipping[]>;

  /**
   * Find shipments with failed deliveries
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findFailedDeliveries(agencyId?: string): Promise<Shipping[]>;

  /**
   * Find shipments requiring attention (failed, overdue, multiple attempts)
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findRequiringAttention(agencyId?: string): Promise<Shipping[]>;

  /**
   * Get shipping tracking summary
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Promise resolving to array of tracking summaries
   */
  getTrackingSummary(
    criteria: ShippingSearchCriteria,
    options?: ShippingQueryOptions
  ): Promise<ShippingTrackingSummary[]>;

  /**
   * Get shipping statistics
   * @param query - Statistics query parameters
   * @returns Promise resolving to shipping statistics
   */
  getStatistics(query: ShippingSummaryQuery): Promise<ShippingStatistics>;

  /**
   * Get daily shipping volume
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to daily volume data
   */
  getDailyVolume(
    dateFrom: Date,
    dateTo: Date,
    agencyId?: string
  ): Promise<
    Array<{
      readonly date: Date;
      readonly count: number;
      readonly totalCost: number;
    }>
  >;

  /**
   * Get carrier performance metrics
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to carrier performance data
   */
  getCarrierPerformance(
    dateFrom: Date,
    dateTo: Date,
    agencyId?: string
  ): Promise<
    Array<{
      readonly carrier: ShippingCarrier;
      readonly totalShipments: number;
      readonly deliveredShipments: number;
      readonly failedShipments: number;
      readonly averageDeliveryTime: number;
      readonly onTimeDeliveryRate: number;
      readonly totalCost: number;
      readonly averageCost: number;
    }>
  >;

  /**
   * Save shipping entity
   * @param shipping - Shipping entity to save
   * @returns Promise resolving to saved shipping entity
   */
  save(shipping: Shipping): Promise<Shipping>;

  /**
   * Update shipping entity
   * @param shipping - Shipping entity to update
   * @returns Promise resolving to updated shipping entity
   */
  update(shipping: Shipping): Promise<Shipping>;

  /**
   * Delete shipping by ID
   * @param id - Shipping ID
   * @returns Promise resolving to boolean indicating success
   */
  delete(id: string): Promise<boolean>;

  /**
   * Bulk save shipping entities
   * @param shipments - Array of shipping entities
   * @returns Promise resolving to bulk operation result
   */
  bulkSave(shipments: Shipping[]): Promise<BulkShippingResult>;

  /**
   * Bulk update shipping statuses
   * @param updates - Array of shipping ID and status pairs
   * @returns Promise resolving to bulk operation result
   */
  bulkUpdateStatus(
    updates: Array<{ id: string; status: ShippingStatus; updatedBy: string }>
  ): Promise<BulkShippingResult>;

  /**
   * Archive old shipments
   * @param olderThanDate - Archive shipments older than this date
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to number of archived shipments
   */
  archive(olderThanDate: Date, agencyId?: string): Promise<number>;

  /**
   * Check if tracking number exists
   * @param trackingNumber - Tracking number to check
   * @param excludeId - Optional shipping ID to exclude from check
   * @returns Promise resolving to boolean indicating existence
   */
  existsByTrackingNumber(trackingNumber: string, excludeId?: string): Promise<boolean>;

  /**
   * Get shipments by agency for reporting
   * @param agencyId - Agency ID
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param options - Query options
   * @returns Promise resolving to array of shipping entities
   */
  findByAgencyAndDateRange(
    agencyId: string,
    dateFrom: Date,
    dateTo: Date,
    options?: ShippingQueryOptions
  ): Promise<Shipping[]>;

  /**
   * Find shipments needing status updates (for integration polling)
   * @param statuses - Statuses to check for updates
   * @param agencyId - Optional agency ID filter
   * @param lastUpdatedBefore - Find shipments not updated since this date
   * @returns Promise resolving to array of shipping entities
   */
  findNeedingStatusUpdate(statuses: ShippingStatus[], agencyId?: string, lastUpdatedBefore?: Date): Promise<Shipping[]>;

  /**
   * Get shipment count by status for dashboard
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to status count mapping
   */
  getStatusCounts(agencyId?: string): Promise<Record<ShippingStatus, number>>;

  /**
   * Find shipments with tracking events after date
   * @param afterDate - Find shipments with events after this date
   * @param agencyId - Optional agency ID filter
   * @returns Promise resolving to array of shipping entities
   */
  findWithRecentTrackingEvents(afterDate: Date, agencyId?: string): Promise<Shipping[]>;

  /**
   * Validate repository health and connectivity
   * @returns Promise resolving to boolean indicating health status
   */
  healthCheck(): Promise<boolean>;
}
