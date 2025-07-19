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
 * Product Service Class
 * Implements all product management operations with mock data
 */
export class ProductService {
  private static readonly BASE_DELAY = 500;
  private static _mockProducts: Product[] | null = null;

  /**
   * Get mock products data (lazy initialization)
   */
  private static getMockProducts(): Product[] {
    if (!ProductService._mockProducts) {
      ProductService._mockProducts = [
        {
          id: 'prod-1',
          sku: 'ELEC001',
          name: 'Premium Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          category: ProductCategory.ELECTRONICS,
          unitOfMeasure: UnitOfMeasure.PIECE,
          status: ProductStatus.ACTIVE,
          costPrice: 150.0,
          costPriceCurrency: 'USD',
          sellingPrice: 299.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890123',
          supplierId: 'sup-001',
          supplierProductCode: 'TSH-001',
          minStockLevel: 10,
          maxStockLevel: 100,
          reorderLevel: 15,
          currentStock: 45,
          reservedStock: 5,
          availableStock: 40,
          weight: 0.35,
          dimensions: { length: 20, width: 18, height: 8 },
          tags: ['wireless', 'bluetooth', 'electronics'],
          agencyId: 'agency-1',
          createdBy: 'user-001',
          createdAt: new Date('2023-01-15'),
          updatedBy: 'user-001',
          updatedAt: new Date('2024-01-10'),
          priceHistory: [],
          stockMovements: [],
        },
        {
          id: 'prod-2',
          sku: 'BOOK001',
          name: 'Business Strategy Handbook',
          description: 'Comprehensive guide to modern business strategy',
          category: ProductCategory.BOOKS_MEDIA,
          unitOfMeasure: UnitOfMeasure.PIECE,
          status: ProductStatus.ACTIVE,
          costPrice: 12.0,
          costPriceCurrency: 'USD',
          sellingPrice: 34.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890124',
          supplierId: 'sup-002',
          supplierProductCode: 'BSH-001',
          minStockLevel: 20,
          maxStockLevel: 200,
          reorderLevel: 30,
          currentStock: 120,
          reservedStock: 10,
          availableStock: 110,
          weight: 0.8,
          dimensions: { length: 24, width: 16, height: 3 },
          tags: ['business', 'book', 'strategy'],
          agencyId: 'agency-1',
          createdBy: 'user-001',
          createdAt: new Date('2023-05-10'),
          updatedBy: 'user-001',
          updatedAt: new Date('2023-12-15'),
          priceHistory: [],
          stockMovements: [],
        },
        {
          id: 'prod-3',
          sku: 'CLOTH001',
          name: 'Professional Business Shirt',
          description: 'High-quality cotton business shirt',
          category: ProductCategory.CLOTHING,
          unitOfMeasure: UnitOfMeasure.PIECE,
          status: ProductStatus.ACTIVE,
          costPrice: 35.0,
          costPriceCurrency: 'USD',
          sellingPrice: 89.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890125',
          supplierId: 'sup-003',
          supplierProductCode: 'PW-001',
          minStockLevel: 15,
          maxStockLevel: 150,
          reorderLevel: 25,
          currentStock: 75,
          reservedStock: 8,
          availableStock: 67,
          weight: 0.3,
          tags: ['clothing', 'shirt', 'professional'],
          agencyId: 'agency-1',
          createdBy: 'user-001',
          createdAt: new Date('2023-06-25'),
          updatedBy: 'user-001',
          updatedAt: new Date('2024-01-08'),
          priceHistory: [],
          stockMovements: [],
        },
        {
          id: 'prod-4',
          sku: 'FOOD001',
          name: 'Premium Coffee Beans',
          description: 'Organic premium coffee beans from Colombia',
          category: ProductCategory.FOOD_BEVERAGE,
          unitOfMeasure: UnitOfMeasure.KILOGRAM,
          status: ProductStatus.ACTIVE,
          costPrice: 25.0,
          costPriceCurrency: 'USD',
          sellingPrice: 49.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890126',
          supplierId: 'sup-004',
          supplierProductCode: 'COF-001',
          minStockLevel: 5,
          maxStockLevel: 50,
          reorderLevel: 10,
          currentStock: 25,
          reservedStock: 2,
          availableStock: 23,
          weight: 1.0,
          tags: ['coffee', 'organic', 'premium'],
          agencyId: 'agency-1',
          createdBy: 'user-001',
          createdAt: new Date('2023-08-15'),
          updatedBy: 'user-001',
          updatedAt: new Date('2024-01-05'),
          priceHistory: [],
          stockMovements: [],
        },
        {
          id: 'prod-5',
          sku: 'HOME001',
          name: 'Smart Home Speaker',
          description: 'Voice-controlled smart speaker with AI assistant',
          category: ProductCategory.ELECTRONICS,
          unitOfMeasure: UnitOfMeasure.PIECE,
          status: ProductStatus.ACTIVE,
          costPrice: 80.0,
          costPriceCurrency: 'USD',
          sellingPrice: 149.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890127',
          supplierId: 'sup-001',
          supplierProductCode: 'SHS-001',
          minStockLevel: 8,
          maxStockLevel: 80,
          reorderLevel: 12,
          currentStock: 35,
          reservedStock: 3,
          availableStock: 32,
          weight: 0.85,
          dimensions: { length: 15, width: 15, height: 10 },
          tags: ['smart', 'speaker', 'ai', 'voice'],
          agencyId: 'agency-2',
          createdBy: 'user-002',
          createdAt: new Date('2023-07-10'),
          updatedBy: 'user-002',
          updatedAt: new Date('2023-12-20'),
          priceHistory: [],
          stockMovements: [],
        },
        {
          id: 'prod-6',
          sku: 'CARE001',
          name: 'Organic Shampoo',
          description: 'Natural organic shampoo for all hair types',
          category: ProductCategory.PERSONAL_CARE,
          unitOfMeasure: UnitOfMeasure.MILLILITER,
          status: ProductStatus.ACTIVE,
          costPrice: 8.0,
          costPriceCurrency: 'USD',
          sellingPrice: 18.99,
          sellingPriceCurrency: 'USD',
          barcode: '1234567890128',
          supplierId: 'sup-005',
          supplierProductCode: 'SHP-001',
          minStockLevel: 20,
          maxStockLevel: 200,
          reorderLevel: 30,
          currentStock: 95,
          reservedStock: 5,
          availableStock: 90,
          weight: 0.35,
          dimensions: { length: 6, width: 6, height: 20 },
          tags: ['organic', 'shampoo', 'hair-care'],
          agencyId: 'agency-3',
          createdBy: 'user-003',
          createdAt: new Date('2023-09-05'),
          updatedBy: 'user-003',
          updatedAt: new Date('2023-11-15'),
          priceHistory: [],
          stockMovements: [],
        },
      ];
    }
    return ProductService._mockProducts;
  }

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

    let filteredProducts = ProductService.getMockProducts().filter((product) => product.agencyId === agencyId);

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
    return ProductService.getMockProducts().find((product) => product.id === productId) || null;
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(agencyId: string, sku: string): Promise<Product | null> {
    await ProductService.delay();
    return (
      ProductService.getMockProducts().find((product) => product.sku === sku && product.agencyId === agencyId) || null
    );
  }

  /**
   * Create new product
   */
  static async createProduct(agencyId: string, productData: CreateProductData, createdBy: string): Promise<Product> {
    await ProductService.delay(800);

    // Validate data
    const validatedData = CreateProductSchema.parse(productData);
    const mockProducts = ProductService.getMockProducts();

    // Check for duplicate SKU
    const existingProduct = mockProducts.find((p) => p.sku === validatedData.sku && p.agencyId === agencyId);
    if (existingProduct) {
      throw new Error(`Product with SKU ${validatedData.sku} already exists`);
    }

    // Check for duplicate barcode if provided
    if (validatedData.barcode) {
      const existingBarcode = mockProducts.find((p) => p.barcode === validatedData.barcode && p.agencyId === agencyId);
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
    mockProducts.push(newProduct);

    return newProduct;
  }

  /**
   * Update product
   */
  static async updateProduct(productId: string, productData: UpdateProductData, updatedBy: string): Promise<Product> {
    await ProductService.delay(600);

    const validatedData = UpdateProductSchema.parse(productData);
    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);

    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];

    // Check for duplicate SKU if updating
    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const duplicateProduct = mockProducts.find(
        (p) => p.sku === validatedData.sku && p.agencyId === existingProduct.agencyId && p.id !== productId
      );
      if (duplicateProduct) {
        throw new Error(`Product with SKU ${validatedData.sku} already exists`);
      }
    }

    // Check for duplicate barcode if updating
    if (validatedData.barcode && validatedData.barcode !== existingProduct.barcode) {
      const duplicateBarcode = mockProducts.find(
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

    mockProducts[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId: string): Promise<void> {
    await ProductService.delay();

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const product = mockProducts[productIndex];

    // Check if product has stock
    if (product.currentStock > 0) {
      throw new Error('Cannot delete product with current stock. Consider discontinuing instead.');
    }

    if (product.reservedStock > 0) {
      throw new Error('Cannot delete product with reserved stock.');
    }

    mockProducts.splice(productIndex, 1);
  }

  /**
   * Update product status
   */
  static async updateProductStatus(productId: string, status: ProductStatus, updatedBy: string): Promise<Product> {
    await ProductService.delay();

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const updatedProduct = {
      ...mockProducts[productIndex],
      status,
      updatedBy,
      updatedAt: new Date(),
    };

    mockProducts[productIndex] = updatedProduct;
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

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];
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

    mockProducts[productIndex] = updatedProduct;
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

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];
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

    mockProducts[productIndex] = updatedProduct;
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

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];

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

    mockProducts[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Reserve stock for orders
   */
  static async reserveStock(productId: string, quantity: number, performedBy: string): Promise<Product> {
    await ProductService.delay();

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];

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

    mockProducts[productIndex] = updatedProduct;
    return updatedProduct;
  }

  /**
   * Release reserved stock
   */
  static async releaseReservedStock(productId: string, quantity: number, performedBy: string): Promise<Product> {
    await ProductService.delay();

    const mockProducts = ProductService.getMockProducts();
    const productIndex = mockProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const existingProduct = mockProducts[productIndex];

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

    mockProducts[productIndex] = updatedProduct;
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

    const agencyProducts = ProductService.getMockProducts().filter((p) => p.agencyId === agencyId);

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
