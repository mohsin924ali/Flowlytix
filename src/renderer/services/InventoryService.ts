/**
 * Inventory Management Service
 * Comprehensive inventory operations with multi-warehouse support
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Inventory Management
 * @architecture Service Layer - Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Warehouse enumeration
 */
export enum WarehouseLocation {
  MAIN_WAREHOUSE = 'MAIN_WAREHOUSE',
  SECONDARY_WAREHOUSE = 'SECONDARY_WAREHOUSE',
  DISTRIBUTION_CENTER = 'DISTRIBUTION_CENTER',
  RETAIL_STORE = 'RETAIL_STORE',
  ONLINE_FULFILLMENT = 'ONLINE_FULFILLMENT',
}

/**
 * Stock movement types
 */
export enum StockMovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
  AUDIT = 'AUDIT',
}

/**
 * Stock movement reasons
 */
export enum StockMovementReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN_FROM_CUSTOMER = 'RETURN_FROM_CUSTOMER',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  DAMAGED_GOODS = 'DAMAGED_GOODS',
  EXPIRED_GOODS = 'EXPIRED_GOODS',
  THEFT = 'THEFT',
  AUDIT_ADJUSTMENT = 'AUDIT_ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  SYSTEM_CORRECTION = 'SYSTEM_CORRECTION',
}

/**
 * Inventory status enumeration
 */
export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  DAMAGED = 'DAMAGED',
  QUARANTINE = 'QUARANTINE',
  IN_TRANSIT = 'IN_TRANSIT',
  EXPIRED = 'EXPIRED',
}

/**
 * Warehouse interface
 */
export interface Warehouse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly location: WarehouseLocation;
  readonly address: string;
  readonly manager: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly capacity: number;
  readonly currentUtilization: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Stock level interface
 */
export interface StockLevel {
  readonly id: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly availableStock: number;
  readonly reservedStock: number;
  readonly damagedStock: number;
  readonly totalStock: number;
  readonly reorderLevel: number;
  readonly maxStockLevel: number;
  readonly lastUpdated: Date;
  readonly lastCountDate?: Date;
}

/**
 * Stock movement interface
 */
export interface StockMovement {
  readonly id: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly movementType: StockMovementType;
  readonly reason: StockMovementReason;
  readonly quantity: number;
  readonly unitCost?: number;
  readonly totalCost?: number;
  readonly referenceNumber?: string;
  readonly orderId?: string;
  readonly supplierId?: string;
  readonly customerId?: string;
  readonly fromWarehouseId?: string;
  readonly toWarehouseId?: string;
  readonly notes?: string;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly batchNumber?: string;
  readonly expiryDate?: Date;
}

/**
 * Stock transfer interface
 */
export interface StockTransfer {
  readonly id: string;
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly requestedBy: string;
  readonly approvedBy?: string;
  readonly status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  readonly requestedAt: Date;
  readonly approvedAt?: Date;
  readonly completedAt?: Date;
  readonly notes?: string;
  readonly trackingNumber?: string;
}

/**
 * Inventory adjustment interface
 */
export interface InventoryAdjustment {
  readonly id: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly adjustmentType: 'INCREASE' | 'DECREASE';
  readonly quantity: number;
  readonly reason: StockMovementReason;
  readonly costImpact: number;
  readonly notes: string;
  readonly performedBy: string;
  readonly approvedBy?: string;
  readonly performedAt: Date;
  readonly batchNumber?: string;
}

/**
 * Stock reservation interface
 */
export interface StockReservation {
  readonly id: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly reservedFor: 'ORDER' | 'TRANSFER' | 'QUALITY_CHECK' | 'MAINTENANCE';
  readonly referenceId: string;
  readonly expiresAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly notes?: string;
}

/**
 * Inventory audit interface
 */
export interface InventoryAudit {
  readonly id: string;
  readonly warehouseId: string;
  readonly auditType: 'FULL' | 'CYCLE' | 'SPOT';
  readonly status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  readonly scheduledDate: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly auditedBy: string[];
  readonly totalItemsAudited: number;
  readonly discrepanciesFound: number;
  readonly totalValueDiscrepancy: number;
  readonly notes?: string;
}

/**
 * Inventory analytics interface
 */
export interface InventoryAnalytics {
  readonly totalValue: number;
  readonly totalItems: number;
  readonly lowStockItems: number;
  readonly outOfStockItems: number;
  readonly excessStockItems: number;
  readonly turnoverRate: number;
  readonly averageDaysOnHand: number;
  readonly warehouseUtilization: Record<string, number>;
  readonly topMovingProducts: Array<{
    productId: string;
    productName: string;
    movementCount: number;
    totalQuantity: number;
  }>;
  readonly slowMovingProducts: Array<{
    productId: string;
    productName: string;
    daysSinceLastMovement: number;
    currentStock: number;
  }>;
}

/**
 * Create warehouse schema
 */
export const CreateWarehouseSchema = z.object({
  code: z.string().min(2, 'Warehouse code must be at least 2 characters'),
  name: z.string().min(1, 'Warehouse name is required'),
  location: z.nativeEnum(WarehouseLocation),
  address: z.string().min(1, 'Address is required'),
  manager: z.string().min(1, 'Manager name is required'),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  capacity: z.number().min(1, 'Capacity must be greater than 0'),
});

export type CreateWarehouseData = z.infer<typeof CreateWarehouseSchema>;

/**
 * Stock movement schema
 */
export const CreateStockMovementSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  movementType: z.nativeEnum(StockMovementType),
  reason: z.nativeEnum(StockMovementReason),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  unitCost: z.number().optional(),
  referenceNumber: z.string().optional(),
  orderId: z.string().optional(),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  notes: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional(),
});

export type CreateStockMovementData = z.infer<typeof CreateStockMovementSchema>;

/**
 * Stock transfer schema
 */
export const CreateStockTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, 'Source warehouse is required'),
  toWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  notes: z.string().optional(),
});

export type CreateStockTransferData = z.infer<typeof CreateStockTransferSchema>;

/**
 * Inventory adjustment schema
 */
export const CreateInventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  adjustmentType: z.enum(['INCREASE', 'DECREASE']),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  reason: z.nativeEnum(StockMovementReason),
  notes: z.string().min(1, 'Adjustment reason is required'),
  batchNumber: z.string().optional(),
});

export type CreateInventoryAdjustmentData = z.infer<typeof CreateInventoryAdjustmentSchema>;

/**
 * Stock reservation schema
 */
export const CreateStockReservationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  reservedFor: z.enum(['ORDER', 'TRANSFER', 'QUALITY_CHECK', 'MAINTENANCE']),
  referenceId: z.string().min(1, 'Reference ID is required'),
  expiresAt: z.date(),
  notes: z.string().optional(),
});

export type CreateStockReservationData = z.infer<typeof CreateStockReservationSchema>;

/**
 * Inventory filters interface
 */
export interface InventoryFilters {
  readonly warehouseId?: string;
  readonly productId?: string;
  readonly movementType?: StockMovementType[];
  readonly reason?: StockMovementReason[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly performedBy?: string;
  readonly lowStock?: boolean;
  readonly outOfStock?: boolean;
  readonly search?: string;
}

/**
 * Inventory Service - Comprehensive inventory management operations
 * Following Clean Architecture and SOLID principles
 */
export class InventoryService {
  private static readonly BASE_DELAY = 300;

  /**
   * Simulate API delay
   */
  private static delay(ms: number = InventoryService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all warehouses
   */
  static async getWarehouses(): Promise<Warehouse[]> {
    await this.delay();
    return [
      {
        id: 'wh-001',
        code: 'MAIN',
        name: 'Main Warehouse',
        location: WarehouseLocation.MAIN_WAREHOUSE,
        address: '123 Industrial Ave, New York, NY 10001',
        manager: 'John Smith',
        contactEmail: 'john.smith@company.com',
        contactPhone: '+1-555-0123',
        capacity: 10000,
        currentUtilization: 7500,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'wh-002',
        code: 'DIST',
        name: 'Distribution Center',
        location: WarehouseLocation.DISTRIBUTION_CENTER,
        address: '456 Commerce Blvd, Los Angeles, CA 90001',
        manager: 'Sarah Johnson',
        contactEmail: 'sarah.johnson@company.com',
        contactPhone: '+1-555-0456',
        capacity: 15000,
        currentUtilization: 12000,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: 'wh-003',
        code: 'RETAIL',
        name: 'Retail Store',
        location: WarehouseLocation.RETAIL_STORE,
        address: '789 Main St, Chicago, IL 60601',
        manager: 'Mike Davis',
        contactEmail: 'mike.davis@company.com',
        contactPhone: '+1-555-0789',
        capacity: 5000,
        currentUtilization: 3200,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-12'),
      },
    ];
  }

  /**
   * Get stock levels for all products across warehouses
   */
  static async getStockLevels(warehouseId?: string): Promise<StockLevel[]> {
    await this.delay();
    const allStockLevels = [
      {
        id: 'sl-001',
        productId: 'prod-001',
        warehouseId: 'wh-001',
        availableStock: 150,
        reservedStock: 25,
        damagedStock: 5,
        totalStock: 180,
        reorderLevel: 50,
        maxStockLevel: 500,
        lastUpdated: new Date(),
        lastCountDate: new Date('2024-01-10'),
      },
      {
        id: 'sl-002',
        productId: 'prod-001',
        warehouseId: 'wh-002',
        availableStock: 200,
        reservedStock: 30,
        damagedStock: 0,
        totalStock: 230,
        reorderLevel: 75,
        maxStockLevel: 600,
        lastUpdated: new Date(),
        lastCountDate: new Date('2024-01-12'),
      },
      {
        id: 'sl-003',
        productId: 'prod-002',
        warehouseId: 'wh-001',
        availableStock: 75,
        reservedStock: 10,
        damagedStock: 2,
        totalStock: 87,
        reorderLevel: 30,
        maxStockLevel: 200,
        lastUpdated: new Date(),
        lastCountDate: new Date('2024-01-08'),
      },
    ];

    return warehouseId ? allStockLevels.filter((sl) => sl.warehouseId === warehouseId) : allStockLevels;
  }

  /**
   * Get stock movements with filtering
   */
  static async getStockMovements(
    filters: InventoryFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    movements: StockMovement[];
    total: number;
    totalPages: number;
  }> {
    await this.delay();

    const allMovements: StockMovement[] = [
      {
        id: 'sm-001',
        productId: 'prod-001',
        warehouseId: 'wh-001',
        movementType: StockMovementType.STOCK_IN,
        reason: StockMovementReason.PURCHASE,
        quantity: 100,
        unitCost: 25.5,
        totalCost: 2550,
        referenceNumber: 'PO-2024-001',
        supplierId: 'sup-001',
        notes: 'Regular stock replenishment',
        performedBy: 'john.doe',
        performedAt: new Date('2024-01-15T10:30:00'),
        batchNumber: 'BATCH-001',
      },
      {
        id: 'sm-002',
        productId: 'prod-001',
        warehouseId: 'wh-001',
        movementType: StockMovementType.STOCK_OUT,
        reason: StockMovementReason.SALE,
        quantity: 25,
        referenceNumber: 'SO-2024-001',
        orderId: 'ord-001',
        customerId: 'cust-001',
        notes: 'Customer order fulfillment',
        performedBy: 'jane.smith',
        performedAt: new Date('2024-01-16T14:15:00'),
      },
      {
        id: 'sm-003',
        productId: 'prod-001',
        warehouseId: 'wh-001',
        movementType: StockMovementType.TRANSFER,
        reason: StockMovementReason.TRANSFER_OUT,
        quantity: 50,
        fromWarehouseId: 'wh-001',
        toWarehouseId: 'wh-002',
        notes: 'Inter-warehouse transfer',
        performedBy: 'admin',
        performedAt: new Date('2024-01-17T09:00:00'),
      },
      {
        id: 'sm-004',
        productId: 'prod-002',
        warehouseId: 'wh-001',
        movementType: StockMovementType.ADJUSTMENT,
        reason: StockMovementReason.AUDIT_ADJUSTMENT,
        quantity: -5,
        notes: 'Cycle count adjustment - discrepancy found',
        performedBy: 'audit.team',
        performedAt: new Date('2024-01-18T16:45:00'),
      },
    ];

    // Apply filters
    let filteredMovements = allMovements;

    if (filters.warehouseId) {
      filteredMovements = filteredMovements.filter((m) => m.warehouseId === filters.warehouseId);
    }
    if (filters.productId) {
      filteredMovements = filteredMovements.filter((m) => m.productId === filters.productId);
    }
    if (filters.movementType?.length) {
      filteredMovements = filteredMovements.filter((m) => filters.movementType!.includes(m.movementType));
    }
    if (filters.reason?.length) {
      filteredMovements = filteredMovements.filter((m) => filters.reason!.includes(m.reason));
    }
    if (filters.dateFrom) {
      filteredMovements = filteredMovements.filter((m) => m.performedAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filteredMovements = filteredMovements.filter((m) => m.performedAt <= filters.dateTo!);
    }

    const total = filteredMovements.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const movements = filteredMovements.slice(startIndex, startIndex + limit);

    return { movements, total, totalPages };
  }

  /**
   * Create stock movement
   */
  static async createStockMovement(data: CreateStockMovementData, performedBy: string): Promise<StockMovement> {
    await this.delay();

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      ...data,
      totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
      performedBy,
      performedAt: new Date(),
    };

    return movement;
  }

  /**
   * Get stock transfers
   */
  static async getStockTransfers(): Promise<StockTransfer[]> {
    await this.delay();

    return [
      {
        id: 'st-001',
        fromWarehouseId: 'wh-001',
        toWarehouseId: 'wh-002',
        productId: 'prod-001',
        quantity: 50,
        requestedBy: 'warehouse.manager',
        approvedBy: 'operations.manager',
        status: 'COMPLETED',
        requestedAt: new Date('2024-01-15T08:00:00'),
        approvedAt: new Date('2024-01-15T09:30:00'),
        completedAt: new Date('2024-01-16T14:00:00'),
        notes: 'Stock balancing between warehouses',
        trackingNumber: 'TRK-001',
      },
      {
        id: 'st-002',
        fromWarehouseId: 'wh-002',
        toWarehouseId: 'wh-003',
        productId: 'prod-002',
        quantity: 25,
        requestedBy: 'store.manager',
        status: 'IN_TRANSIT',
        requestedAt: new Date('2024-01-17T10:00:00'),
        approvedAt: new Date('2024-01-17T11:00:00'),
        notes: 'Store replenishment',
        trackingNumber: 'TRK-002',
      },
    ];
  }

  /**
   * Create stock transfer
   */
  static async createStockTransfer(data: CreateStockTransferData, requestedBy: string): Promise<StockTransfer> {
    await this.delay();

    const transfer: StockTransfer = {
      id: `st-${Date.now()}`,
      ...data,
      requestedBy,
      status: 'PENDING',
      requestedAt: new Date(),
    };

    return transfer;
  }

  /**
   * Create inventory adjustment
   */
  static async createInventoryAdjustment(
    data: CreateInventoryAdjustmentData,
    performedBy: string
  ): Promise<InventoryAdjustment> {
    await this.delay();

    const adjustment: InventoryAdjustment = {
      id: `ia-${Date.now()}`,
      ...data,
      costImpact: data.quantity * 25.5, // Mock cost calculation
      performedBy,
      performedAt: new Date(),
    };

    return adjustment;
  }

  /**
   * Get stock reservations
   */
  static async getStockReservations(): Promise<StockReservation[]> {
    await this.delay();

    return [
      {
        id: 'sr-001',
        productId: 'prod-001',
        warehouseId: 'wh-001',
        quantity: 25,
        reservedFor: 'ORDER',
        referenceId: 'ord-001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: 'order.system',
        createdAt: new Date(),
        notes: 'Reserved for pending customer order',
      },
      {
        id: 'sr-002',
        productId: 'prod-002',
        warehouseId: 'wh-002',
        quantity: 10,
        reservedFor: 'QUALITY_CHECK',
        referenceId: 'qc-001',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdBy: 'quality.team',
        createdAt: new Date(),
        notes: 'Reserved for quality inspection',
      },
    ];
  }

  /**
   * Create stock reservation
   */
  static async createStockReservation(data: CreateStockReservationData, createdBy: string): Promise<StockReservation> {
    await this.delay();

    const reservation: StockReservation = {
      id: `sr-${Date.now()}`,
      ...data,
      createdBy,
      createdAt: new Date(),
    };

    return reservation;
  }

  /**
   * Release stock reservation
   */
  static async releaseStockReservation(reservationId: string): Promise<void> {
    await this.delay();
    // Mock implementation - in real app, this would update the reservation status
  }

  /**
   * Get inventory analytics
   */
  static async getInventoryAnalytics(warehouseId?: string): Promise<InventoryAnalytics> {
    await this.delay();

    return {
      totalValue: 125000,
      totalItems: 250,
      lowStockItems: 15,
      outOfStockItems: 3,
      excessStockItems: 8,
      turnoverRate: 4.5,
      averageDaysOnHand: 45,
      warehouseUtilization: {
        'wh-001': 75,
        'wh-002': 80,
        'wh-003': 64,
      },
      topMovingProducts: [
        {
          productId: 'prod-001',
          productName: 'Premium Widget',
          movementCount: 45,
          totalQuantity: 1250,
        },
        {
          productId: 'prod-002',
          productName: 'Standard Component',
          movementCount: 32,
          totalQuantity: 890,
        },
      ],
      slowMovingProducts: [
        {
          productId: 'prod-010',
          productName: 'Legacy Item',
          daysSinceLastMovement: 120,
          currentStock: 45,
        },
        {
          productId: 'prod-015',
          productName: 'Seasonal Product',
          daysSinceLastMovement: 90,
          currentStock: 28,
        },
      ],
    };
  }

  /**
   * Create warehouse
   */
  static async createWarehouse(data: CreateWarehouseData): Promise<Warehouse> {
    await this.delay();

    const warehouse: Warehouse = {
      id: `wh-${Date.now()}`,
      ...data,
      currentUtilization: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return warehouse;
  }

  /**
   * Update warehouse
   */
  static async updateWarehouse(warehouseId: string, data: Partial<CreateWarehouseData>): Promise<Warehouse> {
    await this.delay();

    // Mock implementation - in real app, this would update the warehouse
    const warehouse: Warehouse = {
      id: warehouseId,
      code: data.code || 'UPDATED',
      name: data.name || 'Updated Warehouse',
      location: data.location || WarehouseLocation.MAIN_WAREHOUSE,
      address: data.address || 'Updated Address',
      manager: data.manager || 'Updated Manager',
      contactEmail: data.contactEmail || 'updated@company.com',
      contactPhone: data.contactPhone || '+1-555-0000',
      capacity: data.capacity || 10000,
      currentUtilization: 5000,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    };

    return warehouse;
  }

  /**
   * Get inventory audits
   */
  static async getInventoryAudits(): Promise<InventoryAudit[]> {
    await this.delay();

    return [
      {
        id: 'audit-001',
        warehouseId: 'wh-001',
        auditType: 'CYCLE',
        status: 'COMPLETED',
        scheduledDate: new Date('2024-01-10'),
        startedAt: new Date('2024-01-10T08:00:00'),
        completedAt: new Date('2024-01-10T17:00:00'),
        auditedBy: ['audit.team.1', 'audit.team.2'],
        totalItemsAudited: 150,
        discrepanciesFound: 5,
        totalValueDiscrepancy: 250.75,
        notes: 'Minor discrepancies found, adjustments made',
      },
      {
        id: 'audit-002',
        warehouseId: 'wh-002',
        auditType: 'FULL',
        status: 'PLANNED',
        scheduledDate: new Date('2024-02-01'),
        auditedBy: ['audit.team.1', 'audit.team.2', 'audit.team.3'],
        totalItemsAudited: 0,
        discrepanciesFound: 0,
        totalValueDiscrepancy: 0,
        notes: 'Annual full inventory audit scheduled',
      },
    ];
  }
}

export default InventoryService;
