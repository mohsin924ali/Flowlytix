/**
 * Product Entity
 *
 * Represents products in the goods distribution system.
 * Core aggregate root for product management including pricing, inventory,
 * supplier relationships, and business operations.
 *
 * Business Rules:
 * - Products must have unique SKU within agency
 * - Pricing must be positive for active products
 * - Stock levels cannot be negative
 * - Products can be active, inactive, or discontinued
 * - Categories and suppliers must be valid
 * - Reorder levels trigger automatic alerts
 * - Price changes require audit trail
 * - Barcode must be unique when provided
 *
 * @domain Product Management
 * @version 1.0.0
 */

import { Money, CurrencyCode } from '../value-objects/money';

/**
 * Product status enumeration
 */
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

/**
 * Product category enumeration
 */
export enum ProductCategory {
  FOOD_BEVERAGE = 'FOOD_BEVERAGE',
  HOUSEHOLD = 'HOUSEHOLD',
  PERSONAL_CARE = 'PERSONAL_CARE',
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  HEALTH_MEDICINE = 'HEALTH_MEDICINE',
  AUTOMOTIVE = 'AUTOMOTIVE',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  TOYS_GAMES = 'TOYS_GAMES',
  BOOKS_MEDIA = 'BOOKS_MEDIA',
  HOME_GARDEN = 'HOME_GARDEN',
  SPORTS_OUTDOORS = 'SPORTS_OUTDOORS',
  OTHER = 'OTHER',
}

/**
 * Product unit of measure
 */
export enum UnitOfMeasure {
  PIECE = 'PIECE', // Individual items
  KILOGRAM = 'KILOGRAM', // Weight-based
  GRAM = 'GRAM', // Small weight
  LITER = 'LITER', // Volume-based
  MILLILITER = 'MILLILITER', // Small volume
  METER = 'METER', // Length-based
  CENTIMETER = 'CENTIMETER', // Small length
  PACK = 'PACK', // Packaged items
  BOX = 'BOX', // Boxed items
  DOZEN = 'DOZEN', // 12 units
  CASE = 'CASE', // Case of items
}

/**
 * Price change reason enumeration
 */
export enum PriceChangeReason {
  COST_UPDATE = 'COST_UPDATE',
  MARKET_ADJUSTMENT = 'MARKET_ADJUSTMENT',
  PROMOTION = 'PROMOTION',
  SUPPLIER_CHANGE = 'SUPPLIER_CHANGE',
  VOLUME_DISCOUNT = 'VOLUME_DISCOUNT',
  SEASONAL_ADJUSTMENT = 'SEASONAL_ADJUSTMENT',
  COMPETITOR_PRICING = 'COMPETITOR_PRICING',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

/**
 * Product creation properties
 */
export interface ProductProps {
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly category: ProductCategory;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly costPrice: Money;
  readonly sellingPrice: Money;
  readonly barcode?: string;
  readonly supplierId?: string;
  readonly supplierProductCode?: string;
  readonly minStockLevel: number;
  readonly maxStockLevel: number;
  readonly reorderLevel: number;
  readonly currentStock: number;
  readonly reservedStock?: number;
  readonly weight?: number;
  readonly dimensions?: ProductDimensions;
  readonly tags?: string[];
  readonly agencyId: string;
  readonly createdBy: string;
}

/**
 * Product dimensions interface
 */
export interface ProductDimensions {
  readonly length: number; // in cm
  readonly width: number; // in cm
  readonly height: number; // in cm
}

/**
 * Price history entry interface
 */
export interface PriceHistoryEntry {
  readonly previousPrice: Money;
  readonly newPrice: Money;
  readonly reason: PriceChangeReason;
  readonly changedBy: string;
  readonly changedAt: Date;
  readonly notes?: string;
}

/**
 * Stock movement entry interface
 */
export interface StockMovementEntry {
  readonly movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  readonly quantity: number;
  readonly previousStock: number;
  readonly newStock: number;
  readonly reason: string;
  readonly reference?: string;
  readonly performedBy: string;
  readonly performedAt: Date;
}

/**
 * Product persistence interface
 */
export interface ProductPersistence {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: ProductCategory;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: ProductStatus;
  readonly costPrice: number; // In smallest currency unit
  readonly costPriceCurrency: CurrencyCode;
  readonly sellingPrice: number; // In smallest currency unit
  readonly sellingPriceCurrency: CurrencyCode;
  readonly barcode: string | null;
  readonly supplierId: string | null;
  readonly supplierProductCode: string | null;
  readonly minStockLevel: number;
  readonly maxStockLevel: number;
  readonly reorderLevel: number;
  readonly currentStock: number;
  readonly reservedStock: number;
  readonly availableStock: number;
  readonly weight: number | null;
  readonly length: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly tags: string[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
  readonly priceHistory: PriceHistoryEntry[];
  readonly stockMovements: StockMovementEntry[];
}

/**
 * Custom error classes for Product domain
 */
export class ProductDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ProductDomainError';
  }
}

export class ProductValidationError extends ProductDomainError {
  constructor(message: string) {
    super(message, 'PRODUCT_VALIDATION_ERROR');
    this.name = 'ProductValidationError';
  }
}

export class InvalidSKUError extends ProductValidationError {
  constructor(sku: string) {
    super(`Invalid SKU format: ${sku}`);
    this.name = 'InvalidSKUError';
  }
}

export class InvalidBarcodeError extends ProductValidationError {
  constructor(barcode: string) {
    super(`Invalid barcode format: ${barcode}`);
    this.name = 'InvalidBarcodeError';
  }
}

export class InvalidStockLevelError extends ProductValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStockLevelError';
  }
}

export class InsufficientStockError extends ProductDomainError {
  constructor(requested: number, available: number) {
    super(`Insufficient stock: requested ${requested}, available ${available}`, 'INSUFFICIENT_STOCK');
    this.name = 'InsufficientStockError';
  }
}

export class ProductStatusError extends ProductDomainError {
  constructor(operation: string, status: ProductStatus) {
    super(`Cannot ${operation} for product with status: ${status}`, 'INVALID_STATUS');
    this.name = 'ProductStatusError';
  }
}

/**
 * Product Entity
 *
 * Aggregate root for product management in the goods distribution system.
 * Handles pricing, inventory, supplier relationships, and business operations
 * with comprehensive validation and audit trail.
 */
export class Product {
  private _id: string;
  private _sku: string;
  private _name: string;
  private _description: string | null;
  private _category: ProductCategory;
  private _unitOfMeasure: UnitOfMeasure;
  private _status: ProductStatus;
  private _costPrice: Money;
  private _sellingPrice: Money;
  private _barcode: string | null;
  private _supplierId: string | null;
  private _supplierProductCode: string | null;
  private _minStockLevel: number;
  private _maxStockLevel: number;
  private _reorderLevel: number;
  private _currentStock: number;
  private _reservedStock: number;
  private _weight: number | null;
  private _dimensions: ProductDimensions | null;
  private _tags: string[];
  private _agencyId: string;
  private _createdBy: string;
  private _createdAt: Date;
  private _updatedBy: string | null;
  private _updatedAt: Date | null;
  private _priceHistory: PriceHistoryEntry[];
  private _stockMovements: StockMovementEntry[];

  private constructor(props: ProductProps, id?: string, skipValidationAndFreeze = false) {
    this._id = id || this.generateId();
    this._sku = props.sku;
    this._name = props.name;
    this._description = props.description || null;
    this._category = props.category;
    this._unitOfMeasure = props.unitOfMeasure;
    this._status = ProductStatus.PENDING_APPROVAL;
    this._costPrice = props.costPrice;
    this._sellingPrice = props.sellingPrice;
    this._barcode = props.barcode || null;
    this._supplierId = props.supplierId || null;
    this._supplierProductCode = props.supplierProductCode || null;
    this._minStockLevel = props.minStockLevel;
    this._maxStockLevel = props.maxStockLevel;
    this._reorderLevel = props.reorderLevel;
    this._currentStock = props.currentStock;
    this._reservedStock = props.reservedStock || 0;
    this._weight = props.weight || null;
    this._dimensions = props.dimensions || null;
    this._tags = [...(props.tags || [])];
    this._agencyId = props.agencyId;
    this._createdBy = props.createdBy;
    this._createdAt = new Date();
    this._updatedBy = null;
    this._updatedAt = null;
    this._priceHistory = [];
    this._stockMovements = [];

    if (!skipValidationAndFreeze) {
      this.validate();
      Object.freeze(this);
    }
  }

  /**
   * Create new Product
   */
  public static create(props: ProductProps): Product {
    return new Product(props);
  }

  /**
   * Reconstruct Product from persistence
   */
  public static fromPersistence(data: ProductPersistence): Product {
    const props: ProductProps = {
      sku: data.sku,
      name: data.name,
      description: data.description,
      category: data.category,
      unitOfMeasure: data.unitOfMeasure,
      costPrice: Money.fromInteger(data.costPrice, data.costPriceCurrency),
      sellingPrice: Money.fromInteger(data.sellingPrice, data.sellingPriceCurrency),
      barcode: data.barcode,
      supplierId: data.supplierId,
      supplierProductCode: data.supplierProductCode,
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel,
      reorderLevel: data.reorderLevel,
      currentStock: data.currentStock,
      reservedStock: data.reservedStock,
      weight: data.weight,
      dimensions:
        data.length && data.width && data.height
          ? {
              length: data.length,
              width: data.width,
              height: data.height,
            }
          : undefined,
      tags: data.tags,
      agencyId: data.agencyId,
      createdBy: data.createdBy,
    };

    const product = new Product(props, data.id, true); // Skip validation and freeze

    // Set persistence-specific properties
    (product as any)._status = data.status;
    (product as any)._createdAt = data.createdAt;
    (product as any)._updatedBy = data.updatedBy;
    (product as any)._updatedAt = data.updatedAt;
    (product as any)._priceHistory = [...data.priceHistory];
    (product as any)._stockMovements = [...data.stockMovements];

    // Now freeze the object
    Object.freeze(product);

    return product;
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get sku(): string {
    return this._sku;
  }
  public get name(): string {
    return this._name;
  }
  public get description(): string | null {
    return this._description;
  }
  public get category(): ProductCategory {
    return this._category;
  }
  public get unitOfMeasure(): UnitOfMeasure {
    return this._unitOfMeasure;
  }
  public get status(): ProductStatus {
    return this._status;
  }
  public get costPrice(): Money {
    return this._costPrice;
  }
  public get sellingPrice(): Money {
    return this._sellingPrice;
  }
  public get barcode(): string | null {
    return this._barcode;
  }
  public get supplierId(): string | null {
    return this._supplierId;
  }
  public get supplierProductCode(): string | null {
    return this._supplierProductCode;
  }
  public get minStockLevel(): number {
    return this._minStockLevel;
  }
  public get maxStockLevel(): number {
    return this._maxStockLevel;
  }
  public get reorderLevel(): number {
    return this._reorderLevel;
  }
  public get currentStock(): number {
    return this._currentStock;
  }
  public get reservedStock(): number {
    return this._reservedStock;
  }
  public get availableStock(): number {
    return this._currentStock - this._reservedStock;
  }
  public get weight(): number | null {
    return this._weight;
  }
  public get dimensions(): ProductDimensions | null {
    return this._dimensions ? { ...this._dimensions } : null;
  }
  public get tags(): string[] {
    return [...this._tags];
  }
  public get agencyId(): string {
    return this._agencyId;
  }
  public get createdBy(): string {
    return this._createdBy;
  }
  public get createdAt(): Date {
    return new Date(this._createdAt);
  }
  public get updatedBy(): string | null {
    return this._updatedBy;
  }
  public get updatedAt(): Date | null {
    return this._updatedAt ? new Date(this._updatedAt) : null;
  }
  public get priceHistory(): PriceHistoryEntry[] {
    return [...this._priceHistory];
  }
  public get stockMovements(): StockMovementEntry[] {
    return [...this._stockMovements];
  }

  // Business Logic Methods

  /**
   * Calculate profit margin percentage
   */
  public getProfitMargin(): number {
    if (this._costPrice.isZero()) {
      return 0;
    }

    const profit = this._sellingPrice.subtract(this._costPrice);
    return (profit.decimalAmount / this._costPrice.decimalAmount) * 100;
  }

  /**
   * Calculate markup percentage
   */
  public getMarkup(): number {
    if (this._costPrice.isZero()) {
      return 0;
    }

    const markup = this._sellingPrice.subtract(this._costPrice);
    return (markup.decimalAmount / this._costPrice.decimalAmount) * 100;
  }

  /**
   * Check if product needs reordering
   */
  public needsReorder(): boolean {
    return this.availableStock <= this._reorderLevel;
  }

  /**
   * Check if product is out of stock
   */
  public isOutOfStock(): boolean {
    return this.availableStock <= 0;
  }

  /**
   * Check if product is low stock
   */
  public isLowStock(): boolean {
    return this.availableStock <= this._minStockLevel && this.availableStock > 0;
  }

  /**
   * Check if product is overstocked
   */
  public isOverstocked(): boolean {
    return this._currentStock > this._maxStockLevel;
  }

  /**
   * Check if product is active and can be sold
   */
  public canBeSold(): boolean {
    return this._status === ProductStatus.ACTIVE && this.availableStock > 0;
  }

  /**
   * Get recommended order quantity
   */
  public getRecommendedOrderQuantity(): number {
    if (!this.needsReorder()) {
      return 0;
    }

    return Math.max(0, this._maxStockLevel - this.availableStock);
  }

  // State Management Methods

  /**
   * Activate product
   */
  public activate(userId: string): Product {
    if (this._status === ProductStatus.DISCONTINUED) {
      throw new ProductStatusError('activate', this._status);
    }

    return this.updateStatus(ProductStatus.ACTIVE, userId);
  }

  /**
   * Deactivate product
   */
  public deactivate(userId: string): Product {
    if (this._status === ProductStatus.DISCONTINUED) {
      throw new ProductStatusError('deactivate', this._status);
    }

    return this.updateStatus(ProductStatus.INACTIVE, userId);
  }

  /**
   * Discontinue product
   */
  public discontinue(userId: string): Product {
    return this.updateStatus(ProductStatus.DISCONTINUED, userId);
  }

  /**
   * Approve pending product
   */
  public approve(userId: string): Product {
    if (this._status !== ProductStatus.PENDING_APPROVAL) {
      throw new ProductStatusError('approve', this._status);
    }

    return this.updateStatus(ProductStatus.ACTIVE, userId);
  }

  // Pricing Methods

  /**
   * Update cost price
   */
  public updateCostPrice(newCostPrice: Money, reason: PriceChangeReason, userId: string, notes?: string): Product {
    this.validatePriceUpdate(newCostPrice);

    const priceEntry: PriceHistoryEntry = {
      previousPrice: this._costPrice,
      newPrice: newCostPrice,
      reason,
      changedBy: userId,
      changedAt: new Date(),
      notes,
    };

    const updatedProduct = this.clone();
    updatedProduct._costPrice = newCostPrice;
    updatedProduct._priceHistory.push(priceEntry);
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  /**
   * Update selling price
   */
  public updateSellingPrice(
    newSellingPrice: Money,
    reason: PriceChangeReason,
    userId: string,
    notes?: string
  ): Product {
    this.validatePriceUpdate(newSellingPrice);

    const priceEntry: PriceHistoryEntry = {
      previousPrice: this._sellingPrice,
      newPrice: newSellingPrice,
      reason,
      changedBy: userId,
      changedAt: new Date(),
      notes,
    };

    const updatedProduct = this.clone();
    updatedProduct._sellingPrice = newSellingPrice;
    updatedProduct._priceHistory.push(priceEntry);
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  // Inventory Methods

  /**
   * Add stock
   */
  public addStock(quantity: number, reason: string, userId: string, reference?: string): Product {
    if (quantity <= 0) {
      throw new InvalidStockLevelError('Quantity must be positive');
    }

    const movement: StockMovementEntry = {
      movementType: 'IN',
      quantity,
      previousStock: this._currentStock,
      newStock: this._currentStock + quantity,
      reason,
      reference,
      performedBy: userId,
      performedAt: new Date(),
    };

    const updatedProduct = this.clone();
    updatedProduct._currentStock += quantity;
    updatedProduct._stockMovements.push(movement);
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    // Update status if out of stock
    if (updatedProduct._status === ProductStatus.OUT_OF_STOCK && updatedProduct.availableStock > 0) {
      updatedProduct._status = ProductStatus.ACTIVE;
    }

    return updatedProduct;
  }

  /**
   * Remove stock
   */
  public removeStock(quantity: number, reason: string, userId: string, reference?: string): Product {
    if (quantity <= 0) {
      throw new InvalidStockLevelError('Quantity must be positive');
    }

    if (quantity > this.availableStock) {
      throw new InsufficientStockError(quantity, this.availableStock);
    }

    const movement: StockMovementEntry = {
      movementType: 'OUT',
      quantity,
      previousStock: this._currentStock,
      newStock: this._currentStock - quantity,
      reason,
      reference,
      performedBy: userId,
      performedAt: new Date(),
    };

    const updatedProduct = this.clone();
    updatedProduct._currentStock -= quantity;
    updatedProduct._stockMovements.push(movement);
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    // Update status if out of stock
    if (updatedProduct.availableStock <= 0) {
      updatedProduct._status = ProductStatus.OUT_OF_STOCK;
    }

    return updatedProduct;
  }

  /**
   * Reserve stock
   */
  public reserveStock(quantity: number, userId: string): Product {
    if (quantity <= 0) {
      throw new InvalidStockLevelError('Quantity must be positive');
    }

    if (quantity > this.availableStock) {
      throw new InsufficientStockError(quantity, this.availableStock);
    }

    const updatedProduct = this.clone();
    updatedProduct._reservedStock += quantity;
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  /**
   * Release reserved stock
   */
  public releaseReservedStock(quantity: number, userId: string): Product {
    if (quantity <= 0) {
      throw new InvalidStockLevelError('Quantity must be positive');
    }

    if (quantity > this._reservedStock) {
      throw new InvalidStockLevelError('Cannot release more than reserved stock');
    }

    const updatedProduct = this.clone();
    updatedProduct._reservedStock -= quantity;
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  /**
   * Adjust stock (for corrections)
   */
  public adjustStock(newStock: number, reason: string, userId: string, reference?: string): Product {
    if (newStock < 0) {
      throw new InvalidStockLevelError('Stock cannot be negative');
    }

    const difference = newStock - this._currentStock;
    const movement: StockMovementEntry = {
      movementType: 'ADJUSTMENT',
      quantity: Math.abs(difference),
      previousStock: this._currentStock,
      newStock,
      reason,
      reference,
      performedBy: userId,
      performedAt: new Date(),
    };

    const updatedProduct = this.clone();
    updatedProduct._currentStock = newStock;
    updatedProduct._stockMovements.push(movement);
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    // Update status based on new stock level
    if (updatedProduct.availableStock <= 0) {
      updatedProduct._status = ProductStatus.OUT_OF_STOCK;
    } else if (updatedProduct._status === ProductStatus.OUT_OF_STOCK) {
      updatedProduct._status = ProductStatus.ACTIVE;
    }

    return updatedProduct;
  }

  // Update Methods

  /**
   * Update basic product information
   */
  public updateBasicInfo(
    updates: {
      name?: string;
      description?: string;
      category?: ProductCategory;
      weight?: number;
      dimensions?: ProductDimensions;
      tags?: string[];
    },
    userId: string
  ): Product {
    const updatedProduct = this.clone();

    if (updates.name !== undefined) {
      this.validateName(updates.name);
      updatedProduct._name = updates.name;
    }

    if (updates.description !== undefined) {
      updatedProduct._description = updates.description || null;
    }

    if (updates.category !== undefined) {
      updatedProduct._category = updates.category;
    }

    if (updates.weight !== undefined) {
      this.validateWeight(updates.weight);
      updatedProduct._weight = updates.weight;
    }

    if (updates.dimensions !== undefined) {
      this.validateDimensions(updates.dimensions);
      updatedProduct._dimensions = updates.dimensions;
    }

    if (updates.tags !== undefined) {
      this.validateTags(updates.tags);
      updatedProduct._tags = [...updates.tags];
    }

    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  /**
   * Update stock levels
   */
  public updateStockLevels(
    updates: {
      minStockLevel?: number;
      maxStockLevel?: number;
      reorderLevel?: number;
    },
    userId: string
  ): Product {
    const newMin = updates.minStockLevel ?? this._minStockLevel;
    const newMax = updates.maxStockLevel ?? this._maxStockLevel;
    const newReorder = updates.reorderLevel ?? this._reorderLevel;

    this.validateStockLevels(newMin, newMax, newReorder);

    const updatedProduct = this.clone();
    updatedProduct._minStockLevel = newMin;
    updatedProduct._maxStockLevel = newMax;
    updatedProduct._reorderLevel = newReorder;
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  /**
   * Update supplier information
   */
  public updateSupplierInfo(
    updates: {
      supplierId?: string;
      supplierProductCode?: string;
    },
    userId: string
  ): Product {
    const updatedProduct = this.clone();

    if (updates.supplierId !== undefined) {
      updatedProduct._supplierId = updates.supplierId || null;
    }

    if (updates.supplierProductCode !== undefined) {
      updatedProduct._supplierProductCode = updates.supplierProductCode || null;
    }

    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();

    return updatedProduct;
  }

  // Utility Methods

  /**
   * Convert to persistence format
   */
  public toPersistence(): ProductPersistence {
    return {
      id: this._id,
      sku: this._sku,
      name: this._name,
      description: this._description,
      category: this._category,
      unitOfMeasure: this._unitOfMeasure,
      status: this._status,
      costPrice: this._costPrice.amount,
      costPriceCurrency: this._costPrice.currency,
      sellingPrice: this._sellingPrice.amount,
      sellingPriceCurrency: this._sellingPrice.currency,
      barcode: this._barcode,
      supplierId: this._supplierId,
      supplierProductCode: this._supplierProductCode,
      minStockLevel: this._minStockLevel,
      maxStockLevel: this._maxStockLevel,
      reorderLevel: this._reorderLevel,
      currentStock: this._currentStock,
      reservedStock: this._reservedStock,
      availableStock: this.availableStock,
      weight: this._weight,
      length: this._dimensions?.length || null,
      width: this._dimensions?.width || null,
      height: this._dimensions?.height || null,
      tags: [...this._tags],
      agencyId: this._agencyId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedBy: this._updatedBy,
      updatedAt: this._updatedAt,
      priceHistory: [...this._priceHistory],
      stockMovements: [...this._stockMovements],
    };
  }

  /**
   * Get display information (safe for UI)
   */
  public getDisplayInfo() {
    return {
      id: this._id,
      sku: this._sku,
      name: this._name,
      description: this._description,
      category: this._category,
      unitOfMeasure: this._unitOfMeasure,
      status: this._status,
      costPrice: this._costPrice.toString(),
      sellingPrice: this._sellingPrice.toString(),
      profitMargin: this.getProfitMargin(),
      markup: this.getMarkup(),
      currentStock: this._currentStock,
      availableStock: this.availableStock,
      reservedStock: this._reservedStock,
      stockStatus: this.getStockStatus(),
      needsReorder: this.needsReorder(),
      canBeSold: this.canBeSold(),
      tags: [...this._tags],
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Get stock status description
   */
  public getStockStatus(): string {
    if (this.isOutOfStock()) return 'Out of Stock';
    if (this.isLowStock()) return 'Low Stock';
    if (this.isOverstocked()) return 'Overstocked';
    if (this.needsReorder()) return 'Needs Reorder';
    return 'In Stock';
  }

  // Private helper methods

  private updateStatus(newStatus: ProductStatus, userId: string): Product {
    const updatedProduct = this.clone();
    updatedProduct._status = newStatus;
    updatedProduct._updatedBy = userId;
    updatedProduct._updatedAt = new Date();
    return updatedProduct;
  }

  private clone(): Product {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);

    // Deep clone arrays
    cloned._tags = [...this._tags];
    cloned._priceHistory = [...this._priceHistory];
    cloned._stockMovements = [...this._stockMovements];

    return cloned;
  }

  private generateId(): string {
    return 'prod_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Validation methods

  private validate(): void {
    this.validateSKU(this._sku);
    this.validateName(this._name);
    this.validatePricing();
    this.validateStockLevels(this._minStockLevel, this._maxStockLevel, this._reorderLevel);

    if (this._barcode) {
      this.validateBarcode(this._barcode);
    }

    if (this._weight !== null) {
      this.validateWeight(this._weight);
    }

    if (this._dimensions) {
      this.validateDimensions(this._dimensions);
    }

    this.validateTags(this._tags);
  }

  private validateSKU(sku: string): void {
    if (!sku || sku.trim().length === 0) {
      throw new InvalidSKUError('SKU cannot be empty');
    }

    if (sku.length > 50) {
      throw new InvalidSKUError('SKU cannot exceed 50 characters');
    }

    // Allow alphanumeric, hyphens, underscores
    if (!/^[A-Za-z0-9\-_]+$/.test(sku)) {
      throw new InvalidSKUError('SKU can only contain letters, numbers, hyphens, and underscores');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ProductValidationError('Product name cannot be empty');
    }

    if (name.length > 200) {
      throw new ProductValidationError('Product name cannot exceed 200 characters');
    }
  }

  private validateBarcode(barcode: string): void {
    // Validate common barcode formats (UPC, EAN, etc.)
    if (!/^\d{8,14}$/.test(barcode)) {
      throw new InvalidBarcodeError('Barcode must be 8-14 digits');
    }
  }

  private validatePricing(): void {
    if (this._costPrice.isNegative()) {
      throw new ProductValidationError('Cost price cannot be negative');
    }

    if (this._sellingPrice.isNegative()) {
      throw new ProductValidationError('Selling price cannot be negative');
    }

    if (!this._costPrice.currency === this._sellingPrice.currency) {
      throw new ProductValidationError('Cost price and selling price must use same currency');
    }
  }

  private validatePriceUpdate(price: Money): void {
    if (price.isNegative()) {
      throw new ProductValidationError('Price cannot be negative');
    }

    if (!price.currency === this._costPrice.currency) {
      throw new ProductValidationError('Price currency must match existing currency');
    }
  }

  private validateStockLevels(min: number, max: number, reorder: number): void {
    if (min < 0 || max < 0 || reorder < 0) {
      throw new InvalidStockLevelError('Stock levels cannot be negative');
    }

    if (min > max) {
      throw new InvalidStockLevelError('Minimum stock level cannot be greater than maximum');
    }

    if (reorder > max) {
      throw new InvalidStockLevelError('Reorder level cannot be greater than maximum stock level');
    }

    if (this._currentStock < 0) {
      throw new InvalidStockLevelError('Current stock cannot be negative');
    }

    if (this._reservedStock < 0) {
      throw new InvalidStockLevelError('Reserved stock cannot be negative');
    }

    if (this._reservedStock > this._currentStock) {
      throw new InvalidStockLevelError('Reserved stock cannot exceed current stock');
    }
  }

  private validateWeight(weight: number): void {
    if (weight < 0) {
      throw new ProductValidationError('Weight cannot be negative');
    }
  }

  private validateDimensions(dimensions: ProductDimensions): void {
    if (dimensions.length < 0 || dimensions.width < 0 || dimensions.height < 0) {
      throw new ProductValidationError('Dimensions cannot be negative');
    }
  }

  private validateTags(tags: string[]): void {
    if (tags.length > 20) {
      throw new ProductValidationError('Cannot have more than 20 tags');
    }

    for (const tag of tags) {
      if (!tag || tag.trim().length === 0) {
        throw new ProductValidationError('Tags cannot be empty');
      }

      if (tag.length > 30) {
        throw new ProductValidationError('Tag cannot exceed 30 characters');
      }
    }
  }
}
