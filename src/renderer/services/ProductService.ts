/**
 * Product Service
 * Service layer for product management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Product Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';

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
  PIECE = 'PIECE',
  KILOGRAM = 'KILOGRAM',
  GRAM = 'GRAM',
  LITER = 'LITER',
  MILLILITER = 'MILLILITER',
  METER = 'METER',
  CENTIMETER = 'CENTIMETER',
  PACK = 'PACK',
  BOX = 'BOX',
  DOZEN = 'DOZEN',
  CASE = 'CASE',
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
  readonly previousPrice: number;
  readonly newPrice: number;
  readonly currency: string;
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
 * Product interface
 */
export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly category: ProductCategory;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: ProductStatus;
  readonly costPrice: number;
  readonly costPriceCurrency: string;
  readonly sellingPrice: number;
  readonly sellingPriceCurrency: string;
  readonly barcode?: string;
  readonly supplierId?: string;
  readonly supplierProductCode?: string;
  readonly minStockLevel: number;
  readonly maxStockLevel: number;
  readonly reorderLevel: number;
  readonly currentStock: number;
  readonly reservedStock: number;
  readonly availableStock: number;
  readonly weight?: number;
  readonly dimensions?: ProductDimensions;
  readonly tags: string[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
  readonly priceHistory: PriceHistoryEntry[];
  readonly stockMovements: StockMovementEntry[];
}

/**
 * Product creation schema
 */
export const CreateProductSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  barcode: z.string().optional(),
  supplierId: z.string().optional(),
  supplierProductCode: z.string().optional(),
  minStockLevel: z.number().min(0, 'Min stock level cannot be negative'),
  maxStockLevel: z.number().min(0, 'Max stock level cannot be negative'),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative'),
  currentStock: z.number().min(0, 'Current stock cannot be negative'),
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
  dimensions: z
    .object({
      length: z.number().min(0, 'Length cannot be negative'),
      width: z.number().min(0, 'Width cannot be negative'),
      height: z.number().min(0, 'Height cannot be negative'),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateProductData = z.infer<typeof CreateProductSchema>;

/**
 * Product update schema
 */
export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductData = z.infer<typeof UpdateProductSchema>;

/**
 * Product filter interface
 */
export interface ProductFilters {
  readonly search?: string;
  readonly status?: ProductStatus[];
  readonly category?: ProductCategory[];
  readonly unitOfMeasure?: UnitOfMeasure[];
  readonly supplierId?: string;
  readonly lowStock?: boolean;
  readonly outOfStock?: boolean;
  readonly needsReorder?: boolean;
  readonly costPriceMin?: number;
  readonly costPriceMax?: number;
  readonly sellingPriceMin?: number;
  readonly sellingPriceMax?: number;
  readonly tags?: string[];
}

/**
 * Product list response
 */
export interface ProductListResponse {
  readonly products: Product[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * Mock product data for development
 */
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'SKU001',
    name: 'Premium Coffee Beans 1kg',
    description: 'High-quality arabica coffee beans, medium roast',
    category: ProductCategory.FOOD_BEVERAGE,
    unitOfMeasure: UnitOfMeasure.KILOGRAM,
    status: ProductStatus.ACTIVE,
    costPrice: 12.5,
    costPriceCurrency: 'USD',
    sellingPrice: 18.99,
    sellingPriceCurrency: 'USD',
    barcode: '1234567890123',
    supplierId: 'supplier-001',
    supplierProductCode: 'COFFEE-001',
    minStockLevel: 50,
    maxStockLevel: 500,
    reorderLevel: 100,
    currentStock: 75,
    reservedStock: 15,
    availableStock: 60,
    weight: 1.0,
    dimensions: {
      length: 20,
      width: 15,
      height: 8,
    },
    tags: ['coffee', 'premium', 'organic'],
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-01-15'),
    updatedBy: 'user-001',
    updatedAt: new Date('2024-01-15'),
    priceHistory: [
      {
        previousPrice: 17.99,
        newPrice: 18.99,
        currency: 'USD',
        reason: PriceChangeReason.COST_UPDATE,
        changedBy: 'user-001',
        changedAt: new Date('2024-01-15'),
        notes: 'Supplier cost increase',
      },
    ],
    stockMovements: [
      {
        movementType: 'IN',
        quantity: 100,
        previousStock: 25,
        newStock: 125,
        reason: 'Stock replenishment',
        reference: 'PO-001',
        performedBy: 'user-001',
        performedAt: new Date('2024-01-10'),
      },
      {
        movementType: 'OUT',
        quantity: 50,
        previousStock: 125,
        newStock: 75,
        reason: 'Sale',
        reference: 'ORD-001',
        performedBy: 'user-002',
        performedAt: new Date('2024-01-12'),
      },
    ],
  },
  {
    id: 'prod-002',
    sku: 'SKU002',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium wireless headphones with noise cancellation',
    category: ProductCategory.ELECTRONICS,
    unitOfMeasure: UnitOfMeasure.PIECE,
    status: ProductStatus.ACTIVE,
    costPrice: 75.0,
    costPriceCurrency: 'USD',
    sellingPrice: 129.99,
    sellingPriceCurrency: 'USD',
    barcode: '2345678901234',
    supplierId: 'supplier-002',
    supplierProductCode: 'HEADPHONES-BT-001',
    minStockLevel: 10,
    maxStockLevel: 100,
    reorderLevel: 20,
    currentStock: 8,
    reservedStock: 3,
    availableStock: 5,
    weight: 0.3,
    dimensions: {
      length: 18,
      width: 16,
      height: 8,
    },
    tags: ['electronics', 'bluetooth', 'headphones', 'wireless'],
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-03-20'),
    priceHistory: [],
    stockMovements: [
      {
        movementType: 'IN',
        quantity: 50,
        previousStock: 0,
        newStock: 50,
        reason: 'Initial stock',
        reference: 'PO-002',
        performedBy: 'user-001',
        performedAt: new Date('2023-03-20'),
      },
    ],
  },
  {
    id: 'prod-003',
    sku: 'SKU003',
    name: 'Organic Shampoo 500ml',
    description: 'Natural organic shampoo for all hair types',
    category: ProductCategory.PERSONAL_CARE,
    unitOfMeasure: UnitOfMeasure.MILLILITER,
    status: ProductStatus.ACTIVE,
    costPrice: 6.5,
    costPriceCurrency: 'USD',
    sellingPrice: 12.99,
    sellingPriceCurrency: 'USD',
    barcode: '3456789012345',
    minStockLevel: 30,
    maxStockLevel: 200,
    reorderLevel: 50,
    currentStock: 120,
    reservedStock: 20,
    availableStock: 100,
    weight: 0.52,
    dimensions: {
      length: 6,
      width: 6,
      height: 20,
    },
    tags: ['shampoo', 'organic', 'natural', 'hair care'],
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-05-10'),
    priceHistory: [],
    stockMovements: [],
  },
  {
    id: 'prod-004',
    sku: 'SKU004',
    name: 'Office Chair - Ergonomic',
    description: 'Ergonomic office chair with lumbar support',
    category: ProductCategory.OFFICE_SUPPLIES,
    unitOfMeasure: UnitOfMeasure.PIECE,
    status: ProductStatus.DISCONTINUED,
    costPrice: 150.0,
    costPriceCurrency: 'USD',
    sellingPrice: 249.99,
    sellingPriceCurrency: 'USD',
    barcode: '4567890123456',
    supplierId: 'supplier-003',
    minStockLevel: 5,
    maxStockLevel: 50,
    reorderLevel: 10,
    currentStock: 0,
    reservedStock: 0,
    availableStock: 0,
    weight: 15.5,
    dimensions: {
      length: 65,
      width: 65,
      height: 110,
    },
    tags: ['office', 'chair', 'ergonomic', 'furniture'],
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2022-08-15'),
    updatedBy: 'user-002',
    updatedAt: new Date('2024-01-05'),
    priceHistory: [],
    stockMovements: [
      {
        movementType: 'OUT',
        quantity: 15,
        previousStock: 15,
        newStock: 0,
        reason: 'Clearance sale',
        performedBy: 'user-002',
        performedAt: new Date('2024-01-05'),
      },
    ],
  },
  {
    id: 'prod-005',
    sku: 'SKU005',
    name: 'Smartphone Case - Clear',
    description: 'Transparent protective case for smartphones',
    category: ProductCategory.ELECTRONICS,
    unitOfMeasure: UnitOfMeasure.PIECE,
    status: ProductStatus.ACTIVE,
    costPrice: 3.25,
    costPriceCurrency: 'USD',
    sellingPrice: 9.99,
    sellingPriceCurrency: 'USD',
    barcode: '5678901234567',
    minStockLevel: 100,
    maxStockLevel: 1000,
    reorderLevel: 200,
    currentStock: 850,
    reservedStock: 50,
    availableStock: 800,
    weight: 0.05,
    dimensions: {
      length: 15,
      width: 8,
      height: 1,
    },
    tags: ['phone', 'case', 'clear', 'protection'],
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-07-25'),
    priceHistory: [],
    stockMovements: [],
  },
];

/**
 * Product Service Class
 * Implements all product management operations with mock data
 */
export class ProductService {
  private static readonly BASE_DELAY = 500;

  /**
   * Simulate API delay
   */
  private static delay(ms: number = ProductService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all products with filtering and pagination
   */
  static async getProducts(
    agencyId: string,
    page: number = 1,
    limit: number = 20,
    filters: ProductFilters = {}
  ): Promise<ProductListResponse> {
    await ProductService.delay();

    let filteredProducts = MOCK_PRODUCTS.filter((product) => product.agencyId === agencyId);

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          product.sku.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search) ||
          product.barcode?.toLowerCase().includes(search) ||
          product.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    if (filters.status && filters.status.length > 0) {
      filteredProducts = filteredProducts.filter((product) => filters.status!.includes(product.status));
    }

    if (filters.category && filters.category.length > 0) {
      filteredProducts = filteredProducts.filter((product) => filters.category!.includes(product.category));
    }

    if (filters.unitOfMeasure && filters.unitOfMeasure.length > 0) {
      filteredProducts = filteredProducts.filter((product) => filters.unitOfMeasure!.includes(product.unitOfMeasure));
    }

    if (filters.supplierId) {
      filteredProducts = filteredProducts.filter((product) => product.supplierId === filters.supplierId);
    }

    if (filters.lowStock) {
      filteredProducts = filteredProducts.filter((product) => product.currentStock <= product.reorderLevel);
    }

    if (filters.outOfStock) {
      filteredProducts = filteredProducts.filter((product) => product.currentStock === 0);
    }

    if (filters.needsReorder) {
      filteredProducts = filteredProducts.filter(
        (product) => product.currentStock <= product.reorderLevel && product.currentStock > 0
      );
    }

    if (filters.costPriceMin !== undefined) {
      filteredProducts = filteredProducts.filter((product) => product.costPrice >= filters.costPriceMin!);
    }

    if (filters.costPriceMax !== undefined) {
      filteredProducts = filteredProducts.filter((product) => product.costPrice <= filters.costPriceMax!);
    }

    if (filters.sellingPriceMin !== undefined) {
      filteredProducts = filteredProducts.filter((product) => product.sellingPrice >= filters.sellingPriceMin!);
    }

    if (filters.sellingPriceMax !== undefined) {
      filteredProducts = filteredProducts.filter((product) => product.sellingPrice <= filters.sellingPriceMax!);
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredProducts = filteredProducts.filter((product) => filters.tags!.some((tag) => product.tags.includes(tag)));
    }

    // Pagination
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const products = filteredProducts.slice(startIndex, endIndex);

    return {
      products,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: string): Promise<Product | null> {
    await ProductService.delay();
    return MOCK_PRODUCTS.find((product) => product.id === productId) || null;
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(agencyId: string, sku: string): Promise<Product | null> {
    await ProductService.delay();
    return MOCK_PRODUCTS.find((product) => product.sku === sku && product.agencyId === agencyId) || null;
  }

  /**
   * Create new product
   */
  static async createProduct(agencyId: string, productData: CreateProductData, createdBy: string): Promise<Product> {
    await ProductService.delay(800);

    // Validate data
    const validatedData = CreateProductSchema.parse(productData);

    // Check for duplicate SKU
    const existingProduct = MOCK_PRODUCTS.find((p) => p.sku === validatedData.sku && p.agencyId === agencyId);
    if (existingProduct) {
      throw new Error(`Product with SKU ${validatedData.sku} already exists`);
    }

    // Check for duplicate barcode if provided
    if (validatedData.barcode) {
      const existingBarcode = MOCK_PRODUCTS.find((p) => p.barcode === validatedData.barcode && p.agencyId === agencyId);
      if (existingBarcode) {
        throw new Error(`Product with barcode ${validatedData.barcode} already exists`);
      }
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: validatedData.sku,
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      unitOfMeasure: validatedData.unitOfMeasure,
      status: ProductStatus.ACTIVE,
      costPrice: validatedData.costPrice,
      costPriceCurrency: 'USD',
      sellingPrice: validatedData.sellingPrice,
      sellingPriceCurrency: 'USD',
      barcode: validatedData.barcode,
      supplierId: validatedData.supplierId,
      supplierProductCode: validatedData.supplierProductCode,
      minStockLevel: validatedData.minStockLevel,
      maxStockLevel: validatedData.maxStockLevel,
      reorderLevel: validatedData.reorderLevel,
      currentStock: validatedData.currentStock,
      reservedStock: 0,
      availableStock: validatedData.currentStock,
      weight: validatedData.weight,
      dimensions: validatedData.dimensions,
      tags: validatedData.tags || [],
      agencyId,
      createdBy,
      createdAt: new Date(),
      priceHistory: [],
      stockMovements:
        validatedData.currentStock > 0
          ? [
              {
                movementType: 'IN',
                quantity: validatedData.currentStock,
                previousStock: 0,
                newStock: validatedData.currentStock,
                reason: 'Initial stock',
                performedBy: createdBy,
                performedAt: new Date(),
              },
            ]
          : [],
    };

    // Add to mock data
    MOCK_PRODUCTS.push(newProduct);

    return newProduct;
  }

  /**
   * Update product
   */
  static async updateProduct(productId: string, productData: UpdateProductData, updatedBy: string): Promise<Product> {
    await ProductService.delay(600);

    const validatedData = UpdateProductSchema.parse(productData);
    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);

    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];

    // Check for duplicate SKU if updating
    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const duplicateProduct = MOCK_PRODUCTS.find(
        (p) => p.sku === validatedData.sku && p.agencyId === existingProduct.agencyId && p.id !== productId
      );
      if (duplicateProduct) {
        throw new Error(`Product with SKU ${validatedData.sku} already exists`);
      }
    }

    // Check for duplicate barcode if updating
    if (validatedData.barcode && validatedData.barcode !== existingProduct.barcode) {
      const duplicateBarcode = MOCK_PRODUCTS.find(
        (p) => p.barcode === validatedData.barcode && p.agencyId === existingProduct.agencyId && p.id !== productId
      );
      if (duplicateBarcode) {
        throw new Error(`Product with barcode ${validatedData.barcode} already exists`);
      }
    }

    const updatedProduct: Product = {
      ...existingProduct,
      ...validatedData,
      availableStock:
        validatedData.currentStock !== undefined
          ? validatedData.currentStock - existingProduct.reservedStock
          : existingProduct.availableStock,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId: string): Promise<void> {
    await ProductService.delay();

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const product = MOCK_PRODUCTS[productIndex];

    // Check if product has stock
    if (product.currentStock > 0) {
      throw new Error('Cannot delete product with current stock. Consider discontinuing instead.');
    }

    if (product.reservedStock > 0) {
      throw new Error('Cannot delete product with reserved stock.');
    }

    MOCK_PRODUCTS.splice(productIndex, 1);
  }

  /**
   * Update product status
   */
  static async updateProductStatus(productId: string, status: ProductStatus, updatedBy: string): Promise<Product> {
    await ProductService.delay();

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const updatedProduct = {
      ...MOCK_PRODUCTS[productIndex],
      status,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Update product prices
   */
  static async updateProductPrices(
    productId: string,
    costPrice?: number,
    sellingPrice?: number,
    reason?: PriceChangeReason,
    updatedBy?: string,
    notes?: string
  ): Promise<Product> {
    await ProductService.delay();

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];
    const priceHistory = [...existingProduct.priceHistory];

    // Add price change to history if selling price changed
    if (sellingPrice !== undefined && sellingPrice !== existingProduct.sellingPrice) {
      priceHistory.push({
        previousPrice: existingProduct.sellingPrice,
        newPrice: sellingPrice,
        currency: existingProduct.sellingPriceCurrency,
        reason: reason || PriceChangeReason.MANUAL_OVERRIDE,
        changedBy: updatedBy || 'system',
        changedAt: new Date(),
        notes,
      });
    }

    const updatedProduct: Product = {
      ...existingProduct,
      costPrice: costPrice !== undefined ? costPrice : existingProduct.costPrice,
      sellingPrice: sellingPrice !== undefined ? sellingPrice : existingProduct.sellingPrice,
      priceHistory,
      updatedBy: updatedBy || existingProduct.updatedBy,
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Add stock to product
   */
  static async addStock(
    productId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    reference?: string
  ): Promise<Product> {
    await ProductService.delay();

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];
    const newStock = existingProduct.currentStock + quantity;

    const stockMovement: StockMovementEntry = {
      movementType: 'IN',
      quantity,
      previousStock: existingProduct.currentStock,
      newStock,
      reason,
      reference,
      performedBy,
      performedAt: new Date(),
    };

    const updatedProduct: Product = {
      ...existingProduct,
      currentStock: newStock,
      availableStock: newStock - existingProduct.reservedStock,
      status:
        newStock > 0 && existingProduct.status === ProductStatus.OUT_OF_STOCK
          ? ProductStatus.ACTIVE
          : existingProduct.status,
      stockMovements: [...existingProduct.stockMovements, stockMovement],
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Remove stock from product
   */
  static async removeStock(
    productId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    reference?: string
  ): Promise<Product> {
    await ProductService.delay();

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];

    if (quantity > existingProduct.availableStock) {
      throw new Error(`Insufficient stock. Available: ${existingProduct.availableStock}, Requested: ${quantity}`);
    }

    const newStock = existingProduct.currentStock - quantity;

    const stockMovement: StockMovementEntry = {
      movementType: 'OUT',
      quantity,
      previousStock: existingProduct.currentStock,
      newStock,
      reason,
      reference,
      performedBy,
      performedAt: new Date(),
    };

    const updatedProduct: Product = {
      ...existingProduct,
      currentStock: newStock,
      availableStock: newStock - existingProduct.reservedStock,
      status: newStock === 0 ? ProductStatus.OUT_OF_STOCK : existingProduct.status,
      stockMovements: [...existingProduct.stockMovements, stockMovement],
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Reserve stock for orders
   */
  static async reserveStock(productId: string, quantity: number, performedBy: string): Promise<Product> {
    await ProductService.delay();

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];

    if (quantity > existingProduct.availableStock) {
      throw new Error(
        `Insufficient stock to reserve. Available: ${existingProduct.availableStock}, Requested: ${quantity}`
      );
    }

    const updatedProduct: Product = {
      ...existingProduct,
      reservedStock: existingProduct.reservedStock + quantity,
      availableStock: existingProduct.availableStock - quantity,
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Release reserved stock
   */
  static async releaseReservedStock(productId: string, quantity: number, performedBy: string): Promise<Product> {
    await ProductService.delay();

    const productIndex = MOCK_PRODUCTS.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = MOCK_PRODUCTS[productIndex];

    if (quantity > existingProduct.reservedStock) {
      throw new Error(
        `Cannot release more than reserved. Reserved: ${existingProduct.reservedStock}, Requested: ${quantity}`
      );
    }

    const updatedProduct: Product = {
      ...existingProduct,
      reservedStock: existingProduct.reservedStock - quantity,
      availableStock: existingProduct.availableStock + quantity,
      updatedAt: new Date(),
    };

    MOCK_PRODUCTS[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Get product analytics summary
   */
  static async getProductAnalytics(agencyId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalStockValue: number;
    averageSellingPrice: number;
    topProductsByValue: Product[];
    productsByCategory: Record<ProductCategory, number>;
    productsByStatus: Record<ProductStatus, number>;
  }> {
    await ProductService.delay();

    const agencyProducts = MOCK_PRODUCTS.filter((p) => p.agencyId === agencyId);

    const totalProducts = agencyProducts.length;
    const activeProducts = agencyProducts.filter((p) => p.status === ProductStatus.ACTIVE).length;
    const lowStockProducts = agencyProducts.filter(
      (p) => p.currentStock <= p.reorderLevel && p.currentStock > 0
    ).length;
    const outOfStockProducts = agencyProducts.filter((p) => p.currentStock === 0).length;
    const totalStockValue = agencyProducts.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    const averageSellingPrice = agencyProducts.reduce((sum, p) => sum + p.sellingPrice, 0) / totalProducts;

    const topProductsByValue = agencyProducts
      .map((p) => ({
        ...p,
        stockValue: p.currentStock * p.costPrice,
      }))
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 5);

    const productsByCategory = agencyProducts.reduce(
      (acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      },
      {} as Record<ProductCategory, number>
    );

    const productsByStatus = agencyProducts.reduce(
      (acc, product) => {
        acc[product.status] = (acc[product.status] || 0) + 1;
        return acc;
      },
      {} as Record<ProductStatus, number>
    );

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
      averageSellingPrice,
      topProductsByValue,
      productsByCategory,
      productsByStatus,
    };
  }
}

export default ProductService;
