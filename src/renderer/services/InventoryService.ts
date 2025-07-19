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
 * Purchase Order Status
 */
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
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
  readonly productId: string;
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly quantity: number;
  readonly requestedBy: string;
  readonly requestedAt: Date;
  readonly approvedBy?: string;
  readonly approvedAt?: Date;
  readonly completedBy?: string;
  readonly completedAt?: Date;
  readonly status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  readonly notes?: string;
  readonly reason?: string;
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
  readonly batchNumber?: string;
  readonly performedBy: string;
  readonly performedAt: Date;
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
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
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
 * Purchase Order interface
 */
export interface PurchaseOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly supplierName: string;
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly orderDate: Date;
  readonly expectedDeliveryDate?: Date;
  readonly actualDeliveryDate?: Date;
  readonly status: PurchaseOrderStatus;
  readonly items: PurchaseOrderItem[];
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

/**
 * Purchase Order Item interface
 */
export interface PurchaseOrderItem {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productCode: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly totalCost: number;
  readonly receivedQuantity: number;
  readonly notes?: string;
}

/**
 * Purchase Order filters
 */
export interface PurchaseOrderFilters {
  readonly status?: PurchaseOrderStatus;
  readonly supplierId?: string;
  readonly warehouseId?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly search?: string;
}

/**
 * Create Purchase Order data
 */
export interface CreatePurchaseOrderData {
  readonly supplierName: string;
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly expectedDeliveryDate?: Date;
  readonly items: CreatePurchaseOrderItemData[];
  readonly notes?: string;
}

/**
 * Create Purchase Order Item data
 */
export interface CreatePurchaseOrderItemData {
  readonly productId: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly notes?: string;
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
 * Purchase Order schema
 */
export const CreatePurchaseOrderSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  supplierId: z.string().min(1, 'Supplier ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  expectedDeliveryDate: z.date().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().min(1, 'Quantity must be greater than 0'),
        unitCost: z.number().min(0, 'Unit cost must be non-negative'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export type CreatePurchaseOrderRequest = z.infer<typeof CreatePurchaseOrderSchema>;

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
        productId: 'prod-001',
        fromWarehouseId: 'wh-001',
        toWarehouseId: 'wh-002',
        quantity: 50,
        requestedBy: 'warehouse.manager',
        requestedAt: new Date('2024-01-15T08:00:00'),
        approvedBy: 'operations.manager',
        approvedAt: new Date('2024-01-15T09:30:00'),
        completedBy: 'warehouse.staff',
        completedAt: new Date('2024-01-16T14:00:00'),
        status: 'COMPLETED',
        notes: 'Stock balancing between warehouses',
        reason: 'Inventory rebalancing',
      },
      {
        id: 'st-002',
        productId: 'prod-002',
        fromWarehouseId: 'wh-002',
        toWarehouseId: 'wh-003',
        quantity: 25,
        requestedBy: 'store.manager',
        requestedAt: new Date('2024-01-17T10:00:00'),
        approvedBy: 'operations.manager',
        approvedAt: new Date('2024-01-17T11:00:00'),
        status: 'APPROVED',
        notes: 'Store replenishment',
        reason: 'Stock replenishment',
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
      productId: data.productId,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      quantity: data.quantity,
      requestedBy,
      requestedAt: new Date(),
      status: 'PENDING',
      notes: data.notes || undefined,
      reason: data.reason || undefined,
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
      productId: data.productId,
      warehouseId: data.warehouseId,
      adjustmentType: data.adjustmentType,
      quantity: data.quantity,
      reason: data.reason,
      notes: data.notes,
      batchNumber: data.batchNumber || undefined,
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
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      reservedFor: data.reservedFor,
      referenceId: data.referenceId,
      expiresAt: data.expiresAt,
      createdBy,
      createdAt: new Date(),
      notes: data.notes || undefined,
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

  /**
   * Get purchase orders
   */
  static async getPurchaseOrders(
    filters: PurchaseOrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    purchaseOrders: PurchaseOrder[];
    total: number;
    totalPages: number;
  }> {
    await this.delay();

    // Use static storage if available, otherwise use default mock data
    let mockPurchaseOrders: PurchaseOrder[];

    if (this.mockPurchaseOrders) {
      mockPurchaseOrders = this.mockPurchaseOrders;
    } else {
      // Default mock data
      mockPurchaseOrders = [
        {
          id: 'po-001',
          orderNumber: 'PO-2024-001',
          supplierName: 'ABC Supplies Ltd',
          supplierId: 'sup-001',
          warehouseId: 'wh-001',
          orderDate: new Date('2024-01-15'),
          expectedDeliveryDate: new Date('2024-02-01'),
          status: PurchaseOrderStatus.RECEIVED,
          subtotalAmount: 12000,
          taxAmount: 1560,
          totalAmount: 13560,
          notes: 'Urgent delivery required',
          createdBy: 'purchasing.manager',
          createdAt: new Date('2024-01-15T09:30:00'),
          items: [
            {
              id: 'poi-001',
              productId: 'prod-001',
              productName: 'Widget A',
              productCode: 'WA-001',
              quantity: 100,
              unitCost: 50.0,
              totalCost: 5000,
              receivedQuantity: 100,
            },
            {
              id: 'poi-002',
              productId: 'prod-002',
              productName: 'Widget B',
              productCode: 'WB-002',
              quantity: 50,
              unitCost: 140.0,
              totalCost: 7000,
              receivedQuantity: 50,
            },
          ],
        },
        {
          id: 'po-002',
          orderNumber: 'PO-2024-002',
          supplierName: 'XYZ Manufacturing',
          supplierId: 'sup-002',
          warehouseId: 'wh-002',
          orderDate: new Date('2024-01-20'),
          expectedDeliveryDate: new Date('2024-02-05'),
          status: PurchaseOrderStatus.ORDERED,
          subtotalAmount: 8500,
          taxAmount: 1105,
          totalAmount: 9605,
          notes: 'Regular monthly order',
          createdBy: 'purchasing.manager',
          createdAt: new Date('2024-01-20T10:00:00'),
          items: [
            {
              id: 'poi-003',
              productId: 'prod-003',
              productName: 'Industrial Part',
              productCode: 'IP-003',
              quantity: 200,
              unitCost: 25.0,
              totalCost: 5000,
              receivedQuantity: 0,
            },
            {
              id: 'poi-004',
              productId: 'prod-004',
              productName: 'Spare Component',
              productCode: 'SP-004',
              quantity: 75,
              unitCost: 46.67,
              totalCost: 3500,
              receivedQuantity: 0,
            },
          ],
        },
        {
          id: 'po-003',
          orderNumber: 'PO-2024-003',
          supplierName: 'Global Parts Inc',
          supplierId: 'sup-003',
          warehouseId: 'wh-001',
          orderDate: new Date('2024-01-22'),
          expectedDeliveryDate: new Date('2024-02-10'),
          status: PurchaseOrderStatus.PENDING,
          subtotalAmount: 3200,
          taxAmount: 416,
          totalAmount: 3616,
          notes: 'Specialty items order',
          createdBy: 'purchasing.manager',
          createdAt: new Date('2024-01-22T14:00:00'),
          items: [
            {
              id: 'poi-005',
              productId: 'prod-005',
              productName: 'Specialty Tool',
              productCode: 'ST-005',
              quantity: 20,
              unitCost: 160.0,
              totalCost: 3200,
              receivedQuantity: 0,
            },
          ],
        },
      ];

      // Initialize static storage with default data
      this.mockPurchaseOrders = mockPurchaseOrders;
    }

    // Apply filters
    let filteredOrders = mockPurchaseOrders;

    if (filters.status) {
      filteredOrders = filteredOrders.filter((po) => po.status === filters.status);
    }

    if (filters.supplierId) {
      filteredOrders = filteredOrders.filter((po) => po.supplierId === filters.supplierId);
    }

    if (filters.warehouseId) {
      filteredOrders = filteredOrders.filter((po) => po.warehouseId === filters.warehouseId);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(
        (po) =>
          po.orderNumber.toLowerCase().includes(searchLower) ||
          po.supplierName.toLowerCase().includes(searchLower) ||
          po.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.startDate) {
      filteredOrders = filteredOrders.filter((po) => po.orderDate >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredOrders = filteredOrders.filter((po) => po.orderDate <= filters.endDate!);
    }

    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      purchaseOrders: filteredOrders.slice(start, end),
      total,
      totalPages,
    };
  }

  /**
   * Get purchase order by ID
   */
  static async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    await this.delay();

    const { purchaseOrders } = await this.getPurchaseOrders();
    return purchaseOrders.find((po) => po.id === id) || null;
  }

  /**
   * Create purchase order
   */
  static async createPurchaseOrder(data: CreatePurchaseOrderData, createdBy: string): Promise<PurchaseOrder> {
    await this.delay();

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const tax = subtotal * 0.13; // 13% tax
    const total = subtotal + tax;

    const purchaseOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      supplierName: data.supplierName,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      orderDate: new Date(),
      ...(data.expectedDeliveryDate && { expectedDeliveryDate: data.expectedDeliveryDate }),
      status: PurchaseOrderStatus.DRAFT,
      subtotalAmount: subtotal,
      taxAmount: tax,
      totalAmount: total,
      ...(data.notes && { notes: data.notes }),
      createdBy,
      createdAt: new Date(),
      items: data.items.map((item, index) => ({
        id: `poi-${Date.now()}-${index}`,
        productId: item.productId,
        productName: `Product ${item.productId}`, // In real implementation, fetch from product service
        productCode: `PC-${item.productId}`, // In real implementation, fetch from product service
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        receivedQuantity: 0,
        ...(item.notes && { notes: item.notes }),
      })),
    };

    // Store the purchase order in mock data by adding it to the static mock array
    // In a real application, this would be saved to database
    const { purchaseOrders: currentOrders } = await this.getPurchaseOrders({}, 1, 1000);

    // Add to the beginning of the array to show newest first
    // We'll store it in a static variable to persist across calls
    if (!this.mockPurchaseOrders) {
      this.mockPurchaseOrders = currentOrders;
    }
    this.mockPurchaseOrders.unshift(purchaseOrder);

    return purchaseOrder;
  }

  // Static storage for mock purchase orders to persist across calls
  private static mockPurchaseOrders: PurchaseOrder[] | null = null;

  /**
   * Update purchase order status
   */
  static async updatePurchaseOrderStatus(
    id: string,
    status: PurchaseOrderStatus,
    updatedBy: string
  ): Promise<PurchaseOrder> {
    await this.delay();

    const purchaseOrder = await this.getPurchaseOrderById(id);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    const updatedOrder: PurchaseOrder = {
      ...purchaseOrder,
      status,
      updatedBy,
      updatedAt: new Date(),
      ...(status === PurchaseOrderStatus.RECEIVED && { actualDeliveryDate: new Date() }),
    };

    return updatedOrder;
  }

  /**
   * Delete purchase order
   */
  static async deletePurchaseOrder(id: string): Promise<void> {
    await this.delay();
    // Mock implementation - in real app, this would delete from database
  }
}

export default InventoryService;
