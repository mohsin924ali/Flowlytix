/**
 * Product Entity Tests
 *
 * Comprehensive test suite covering all functionality of the Product entity
 * including business logic, inventory management, pricing, validation, and edge cases.
 *
 * @domain Product Management
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Product,
  ProductProps,
  ProductStatus,
  ProductCategory,
  UnitOfMeasure,
  PriceChangeReason,
  ProductDomainError,
  ProductValidationError,
  InvalidSKUError,
  InvalidBarcodeError,
  InvalidStockLevelError,
  InsufficientStockError,
  ProductStatusError,
} from '../product';
import { Money } from '../../value-objects/money';

describe('Product Entity', () => {
  let validProductProps: ProductProps;
  let product: Product;

  beforeEach(() => {
    validProductProps = {
      sku: 'PROD-123',
      name: 'Test Product',
      description: 'A test product for testing',
      category: ProductCategory.FOOD_BEVERAGE,
      unitOfMeasure: UnitOfMeasure.PIECE,
      costPrice: Money.fromDecimal(10.0, 'USD'),
      sellingPrice: Money.fromDecimal(15.0, 'USD'),
      barcode: '1234567890123',
      supplierId: 'supplier-123',
      supplierProductCode: 'SUP-PROD-456',
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderLevel: 20,
      currentStock: 50,
      reservedStock: 5,
      weight: 0.5,
      dimensions: {
        length: 10,
        width: 5,
        height: 3,
      },
      tags: ['electronics', 'popular'],
      agencyId: 'agency-123',
      createdBy: 'user-123',
    };

    product = Product.create(validProductProps);
  });

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create a product with valid properties', () => {
        const newProduct = Product.create(validProductProps);

        expect(newProduct.sku).toBe('PROD-123');
        expect(newProduct.name).toBe('Test Product');
        expect(newProduct.description).toBe('A test product for testing');
        expect(newProduct.category).toBe(ProductCategory.FOOD_BEVERAGE);
        expect(newProduct.unitOfMeasure).toBe(UnitOfMeasure.PIECE);
        expect(newProduct.costPrice.equals(Money.fromDecimal(10.0, 'USD'))).toBe(true);
        expect(newProduct.sellingPrice.equals(Money.fromDecimal(15.0, 'USD'))).toBe(true);
        expect(newProduct.status).toBe(ProductStatus.PENDING_APPROVAL);
        expect(newProduct.currentStock).toBe(50);
        expect(newProduct.reservedStock).toBe(5);
        expect(newProduct.availableStock).toBe(45);
        expect(newProduct.agencyId).toBe('agency-123');
        expect(newProduct.createdBy).toBe('user-123');
        expect(newProduct.id).toBeDefined();
        expect(newProduct.createdAt).toBeInstanceOf(Date);
      });

      it('should create product with minimal required properties', () => {
        const minimalProps: ProductProps = {
          sku: 'MIN-001',
          name: 'Minimal Product',
          category: ProductCategory.OTHER,
          unitOfMeasure: UnitOfMeasure.PIECE,
          costPrice: Money.fromDecimal(5.0, 'USD'),
          sellingPrice: Money.fromDecimal(8.0, 'USD'),
          minStockLevel: 0,
          maxStockLevel: 10,
          reorderLevel: 2,
          currentStock: 0,
          agencyId: 'agency-123',
          createdBy: 'user-123',
        };

        const newProduct = Product.create(minimalProps);

        expect(newProduct.sku).toBe('MIN-001');
        expect(newProduct.name).toBe('Minimal Product');
        expect(newProduct.description).toBeNull();
        expect(newProduct.barcode).toBeNull();
        expect(newProduct.supplierId).toBeNull();
        expect(newProduct.reservedStock).toBe(0);
      });

      it('should generate unique IDs for different products', () => {
        const product1 = Product.create(validProductProps);
        const product2 = Product.create(validProductProps);

        expect(product1.id).not.toBe(product2.id);
      });

      it('should freeze the product instance', () => {
        const newProduct = Product.create(validProductProps);

        expect(Object.isFrozen(newProduct)).toBe(true);
      });
    });

    describe('fromPersistence', () => {
      it('should reconstruct product from persistence data', () => {
        const persistenceData = product.toPersistence();
        const reconstructed = Product.fromPersistence(persistenceData);

        expect(reconstructed.id).toBe(product.id);
        expect(reconstructed.sku).toBe(product.sku);
        expect(reconstructed.name).toBe(product.name);
        expect(reconstructed.costPrice.equals(product.costPrice)).toBe(true);
        expect(reconstructed.sellingPrice.equals(product.sellingPrice)).toBe(true);
        expect(reconstructed.currentStock).toBe(product.currentStock);
        expect(reconstructed.createdAt.getTime()).toBe(product.createdAt.getTime());
      });

      it('should handle product with price history and stock movements', () => {
        // Update price to create history
        const updatedProduct = product.updateSellingPrice(
          Money.fromDecimal(18.0, 'USD'),
          PriceChangeReason.MARKET_ADJUSTMENT,
          'user-456',
          'Market price adjustment'
        );

        // Add stock to create movement
        const stockProduct = updatedProduct.addStock(25, 'Restock', 'user-456', 'PO-789');

        const persistenceData = stockProduct.toPersistence();
        const reconstructed = Product.fromPersistence(persistenceData);

        expect(reconstructed.priceHistory).toHaveLength(1);
        expect(reconstructed.stockMovements).toHaveLength(1);
        expect(reconstructed.sellingPrice.equals(Money.fromDecimal(18.0, 'USD'))).toBe(true);
        expect(reconstructed.currentStock).toBe(75);
      });
    });
  });

  describe('Validation', () => {
    describe('SKU validation', () => {
      it('should throw InvalidSKUError for empty SKU', () => {
        const props = { ...validProductProps, sku: '' };

        expect(() => Product.create(props)).toThrow(InvalidSKUError);
      });

      it('should throw InvalidSKUError for SKU with spaces', () => {
        const props = { ...validProductProps, sku: 'PROD 123' };

        expect(() => Product.create(props)).toThrow(InvalidSKUError);
      });

      it('should throw InvalidSKUError for SKU with special characters', () => {
        const props = { ...validProductProps, sku: 'PROD@123' };

        expect(() => Product.create(props)).toThrow(InvalidSKUError);
      });

      it('should throw InvalidSKUError for SKU exceeding length limit', () => {
        const props = { ...validProductProps, sku: 'A'.repeat(51) };

        expect(() => Product.create(props)).toThrow(InvalidSKUError);
      });

      it('should accept valid SKU formats', () => {
        const validSKUs = ['PROD-123', 'ITEM_456', 'SKU789', 'A-B_C-123'];

        validSKUs.forEach((sku) => {
          const props = { ...validProductProps, sku };
          expect(() => Product.create(props)).not.toThrow();
        });
      });
    });

    describe('Name validation', () => {
      it('should throw ProductValidationError for empty name', () => {
        const props = { ...validProductProps, name: '' };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should throw ProductValidationError for name exceeding length limit', () => {
        const props = { ...validProductProps, name: 'A'.repeat(201) };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });
    });

    describe('Barcode validation', () => {
      it('should throw InvalidBarcodeError for invalid barcode length', () => {
        const props = { ...validProductProps, barcode: '123' };

        expect(() => Product.create(props)).toThrow(InvalidBarcodeError);
      });

      it('should throw InvalidBarcodeError for non-numeric barcode', () => {
        const props = { ...validProductProps, barcode: 'ABC12345678' };

        expect(() => Product.create(props)).toThrow(InvalidBarcodeError);
      });

      it('should accept valid barcode formats', () => {
        const validBarcodes = ['12345678', '123456789012', '12345678901234'];

        validBarcodes.forEach((barcode) => {
          const props = { ...validProductProps, barcode };
          expect(() => Product.create(props)).not.toThrow();
        });
      });
    });

    describe('Pricing validation', () => {
      it('should throw ProductValidationError for negative cost price', () => {
        const props = { ...validProductProps, costPrice: Money.fromDecimal(-1.0, 'USD') };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should throw ProductValidationError for negative selling price', () => {
        const props = { ...validProductProps, sellingPrice: Money.fromDecimal(-1.0, 'USD') };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should accept zero prices', () => {
        const props = {
          ...validProductProps,
          costPrice: Money.zero('USD'),
          sellingPrice: Money.zero('USD'),
        };

        expect(() => Product.create(props)).not.toThrow();
      });
    });

    describe('Stock level validation', () => {
      it('should throw InvalidStockLevelError for negative stock levels', () => {
        const props = { ...validProductProps, minStockLevel: -1 };

        expect(() => Product.create(props)).toThrow(InvalidStockLevelError);
      });

      it('should throw InvalidStockLevelError when min > max', () => {
        const props = { ...validProductProps, minStockLevel: 50, maxStockLevel: 30 };

        expect(() => Product.create(props)).toThrow(InvalidStockLevelError);
      });

      it('should throw InvalidStockLevelError when reorder > max', () => {
        const props = { ...validProductProps, reorderLevel: 150, maxStockLevel: 100 };

        expect(() => Product.create(props)).toThrow(InvalidStockLevelError);
      });

      it('should throw InvalidStockLevelError for negative current stock', () => {
        const props = { ...validProductProps, currentStock: -1 };

        expect(() => Product.create(props)).toThrow(InvalidStockLevelError);
      });

      it('should throw InvalidStockLevelError when reserved > current', () => {
        const props = { ...validProductProps, currentStock: 10, reservedStock: 15 };

        expect(() => Product.create(props)).toThrow(InvalidStockLevelError);
      });
    });

    describe('Weight and dimensions validation', () => {
      it('should throw ProductValidationError for negative weight', () => {
        const props = { ...validProductProps, weight: -1 };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should throw ProductValidationError for negative dimensions', () => {
        const props = {
          ...validProductProps,
          dimensions: { length: -1, width: 5, height: 3 },
        };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });
    });

    describe('Tags validation', () => {
      it('should throw ProductValidationError for too many tags', () => {
        const props = { ...validProductProps, tags: Array(21).fill('tag') };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should throw ProductValidationError for empty tags', () => {
        const props = { ...validProductProps, tags: ['valid', '', 'another'] };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });

      it('should throw ProductValidationError for tags exceeding length limit', () => {
        const props = { ...validProductProps, tags: ['A'.repeat(31)] };

        expect(() => Product.create(props)).toThrow(ProductValidationError);
      });
    });
  });

  describe('Business Logic Methods', () => {
    describe('getProfitMargin', () => {
      it('should calculate profit margin correctly', () => {
        // Cost: $10, Selling: $15, Profit: $5, Margin: 50%
        const margin = product.getProfitMargin();

        expect(margin).toBe(50);
      });

      it('should return 0 for zero cost price', () => {
        const props = {
          ...validProductProps,
          costPrice: Money.zero('USD'),
          sellingPrice: Money.fromDecimal(10.0, 'USD'),
        };
        const zeroProduct = Product.create(props);

        expect(zeroProduct.getProfitMargin()).toBe(0);
      });

      it('should handle negative profit margin', () => {
        const props = {
          ...validProductProps,
          costPrice: Money.fromDecimal(20.0, 'USD'),
          sellingPrice: Money.fromDecimal(15.0, 'USD'),
        };
        const lossProduct = Product.create(props);

        expect(lossProduct.getProfitMargin()).toBe(-25);
      });
    });

    describe('getMarkup', () => {
      it('should calculate markup correctly', () => {
        // Cost: $10, Selling: $15, Markup: 50%
        const markup = product.getMarkup();

        expect(markup).toBe(50);
      });

      it('should return 0 for zero cost price', () => {
        const props = {
          ...validProductProps,
          costPrice: Money.zero('USD'),
          sellingPrice: Money.fromDecimal(10.0, 'USD'),
        };
        const zeroProduct = Product.create(props);

        expect(zeroProduct.getMarkup()).toBe(0);
      });
    });

    describe('Stock status methods', () => {
      it('should correctly identify when reorder is needed', () => {
        // Available stock: 45 (50 - 5), Reorder level: 20
        expect(product.needsReorder()).toBe(false);

        const lowStockProps = { ...validProductProps, currentStock: 15, reservedStock: 0 };
        const lowStockProduct = Product.create(lowStockProps);
        expect(lowStockProduct.needsReorder()).toBe(true);
      });

      it('should correctly identify out of stock', () => {
        expect(product.isOutOfStock()).toBe(false);

        const outOfStockProps = { ...validProductProps, currentStock: 5, reservedStock: 5 };
        const outOfStockProduct = Product.create(outOfStockProps);
        expect(outOfStockProduct.isOutOfStock()).toBe(true);
      });

      it('should correctly identify low stock', () => {
        expect(product.isLowStock()).toBe(false);

        const lowStockProps = { ...validProductProps, currentStock: 8, reservedStock: 0 };
        const lowStockProduct = Product.create(lowStockProps);
        expect(lowStockProduct.isLowStock()).toBe(true);
      });

      it('should correctly identify overstocked', () => {
        expect(product.isOverstocked()).toBe(false);

        const overstockedProps = { ...validProductProps, currentStock: 150 };
        const overstockedProduct = Product.create(overstockedProps);
        expect(overstockedProduct.isOverstocked()).toBe(true);
      });

      it('should correctly identify if product can be sold', () => {
        expect(product.canBeSold()).toBe(false); // Status is PENDING_APPROVAL

        const activeProduct = product.activate('user-123');
        expect(activeProduct.canBeSold()).toBe(true);

        const outOfStockProduct = activeProduct.adjustStock(0, 'Test adjustment', 'user-123');
        expect(outOfStockProduct.canBeSold()).toBe(false);
      });

      it('should calculate recommended order quantity', () => {
        expect(product.getRecommendedOrderQuantity()).toBe(0); // Not needed

        const lowStockProps = { ...validProductProps, currentStock: 15, reservedStock: 0 };
        const lowStockProduct = Product.create(lowStockProps);
        expect(lowStockProduct.getRecommendedOrderQuantity()).toBe(85); // 100 - 15
      });

      it('should get stock status description', () => {
        expect(product.getStockStatus()).toBe('In Stock');

        const outOfStockProduct = product.adjustStock(0, 'Test', 'user-123');
        expect(outOfStockProduct.getStockStatus()).toBe('Out of Stock');
      });
    });
  });

  describe('State Management', () => {
    describe('Status transitions', () => {
      it('should activate pending product', () => {
        expect(product.status).toBe(ProductStatus.PENDING_APPROVAL);

        const activatedProduct = product.approve('user-123');

        expect(activatedProduct.status).toBe(ProductStatus.ACTIVE);
        expect(activatedProduct.updatedBy).toBe('user-123');
        expect(activatedProduct.updatedAt).toBeInstanceOf(Date);
      });

      it('should activate and deactivate product', () => {
        const activeProduct = product.activate('user-123');
        expect(activeProduct.status).toBe(ProductStatus.ACTIVE);

        const inactiveProduct = activeProduct.deactivate('user-456');
        expect(inactiveProduct.status).toBe(ProductStatus.INACTIVE);
        expect(inactiveProduct.updatedBy).toBe('user-456');
      });

      it('should discontinue product', () => {
        const discontinuedProduct = product.discontinue('user-123');

        expect(discontinuedProduct.status).toBe(ProductStatus.DISCONTINUED);
        expect(discontinuedProduct.updatedBy).toBe('user-123');
      });

      it('should throw error when trying to activate discontinued product', () => {
        const discontinuedProduct = product.discontinue('user-123');

        expect(() => discontinuedProduct.activate('user-456')).toThrow(ProductStatusError);
      });

      it('should throw error when trying to approve non-pending product', () => {
        const activeProduct = product.activate('user-123');

        expect(() => activeProduct.approve('user-456')).toThrow(ProductStatusError);
      });
    });
  });

  describe('Pricing Management', () => {
    describe('updateCostPrice', () => {
      it('should update cost price and create history entry', () => {
        const newCostPrice = Money.fromDecimal(12.0, 'USD');
        const updatedProduct = product.updateCostPrice(
          newCostPrice,
          PriceChangeReason.SUPPLIER_CHANGE,
          'user-456',
          'Supplier increased prices'
        );

        expect(updatedProduct.costPrice.equals(newCostPrice)).toBe(true);
        expect(updatedProduct.priceHistory).toHaveLength(1);
        expect(updatedProduct.priceHistory[0].previousPrice.equals(product.costPrice)).toBe(true);
        expect(updatedProduct.priceHistory[0].newPrice.equals(newCostPrice)).toBe(true);
        expect(updatedProduct.priceHistory[0].reason).toBe(PriceChangeReason.SUPPLIER_CHANGE);
        expect(updatedProduct.priceHistory[0].changedBy).toBe('user-456');
        expect(updatedProduct.priceHistory[0].notes).toBe('Supplier increased prices');
        expect(updatedProduct.updatedBy).toBe('user-456');
      });

      it('should throw error for negative price', () => {
        const invalidPrice = Money.fromDecimal(-1.0, 'USD');

        expect(() => product.updateCostPrice(invalidPrice, PriceChangeReason.COST_UPDATE, 'user-123')).toThrow(
          ProductValidationError
        );
      });
    });

    describe('updateSellingPrice', () => {
      it('should update selling price and create history entry', () => {
        const newSellingPrice = Money.fromDecimal(18.0, 'USD');
        const updatedProduct = product.updateSellingPrice(
          newSellingPrice,
          PriceChangeReason.MARKET_ADJUSTMENT,
          'user-456'
        );

        expect(updatedProduct.sellingPrice.equals(newSellingPrice)).toBe(true);
        expect(updatedProduct.priceHistory).toHaveLength(1);
        expect(updatedProduct.priceHistory[0].previousPrice.equals(product.sellingPrice)).toBe(true);
        expect(updatedProduct.priceHistory[0].newPrice.equals(newSellingPrice)).toBe(true);
        expect(updatedProduct.priceHistory[0].reason).toBe(PriceChangeReason.MARKET_ADJUSTMENT);
      });
    });
  });

  describe('Inventory Management', () => {
    describe('addStock', () => {
      it('should add stock and create movement entry', () => {
        const updatedProduct = product.addStock(25, 'Purchase order', 'user-123', 'PO-456');

        expect(updatedProduct.currentStock).toBe(75);
        expect(updatedProduct.stockMovements).toHaveLength(1);
        expect(updatedProduct.stockMovements[0].movementType).toBe('IN');
        expect(updatedProduct.stockMovements[0].quantity).toBe(25);
        expect(updatedProduct.stockMovements[0].previousStock).toBe(50);
        expect(updatedProduct.stockMovements[0].newStock).toBe(75);
        expect(updatedProduct.stockMovements[0].reason).toBe('Purchase order');
        expect(updatedProduct.stockMovements[0].reference).toBe('PO-456');
        expect(updatedProduct.stockMovements[0].performedBy).toBe('user-123');
      });

      it('should change status from OUT_OF_STOCK to ACTIVE when adding stock', () => {
        const outOfStockProduct = product.adjustStock(0, 'Test', 'user-123');
        expect(outOfStockProduct.status).toBe(ProductStatus.OUT_OF_STOCK);

        const restoredProduct = outOfStockProduct.addStock(10, 'Restock', 'user-123');
        expect(restoredProduct.status).toBe(ProductStatus.ACTIVE);
      });

      it('should throw error for non-positive quantity', () => {
        expect(() => product.addStock(0, 'Invalid', 'user-123')).toThrow(InvalidStockLevelError);
        expect(() => product.addStock(-5, 'Invalid', 'user-123')).toThrow(InvalidStockLevelError);
      });
    });

    describe('removeStock', () => {
      it('should remove stock and create movement entry', () => {
        const updatedProduct = product.removeStock(20, 'Sale', 'user-123');

        expect(updatedProduct.currentStock).toBe(30);
        expect(updatedProduct.stockMovements).toHaveLength(1);
        expect(updatedProduct.stockMovements[0].movementType).toBe('OUT');
        expect(updatedProduct.stockMovements[0].quantity).toBe(20);
        expect(updatedProduct.stockMovements[0].previousStock).toBe(50);
        expect(updatedProduct.stockMovements[0].newStock).toBe(30);
      });

      it('should change status to OUT_OF_STOCK when removing all available stock', () => {
        const updatedProduct = product.removeStock(45, 'Large sale', 'user-123'); // 50 - 5 reserved = 45 available

        expect(updatedProduct.currentStock).toBe(5);
        expect(updatedProduct.availableStock).toBe(0);
        expect(updatedProduct.status).toBe(ProductStatus.OUT_OF_STOCK);
      });

      it('should throw InsufficientStockError when trying to remove more than available', () => {
        expect(() => product.removeStock(50, 'Invalid', 'user-123')) // Only 45 available
          .toThrow(InsufficientStockError);
      });
    });

    describe('reserveStock', () => {
      it('should reserve stock successfully', () => {
        const updatedProduct = product.reserveStock(10, 'user-123');

        expect(updatedProduct.reservedStock).toBe(15); // 5 + 10
        expect(updatedProduct.availableStock).toBe(35); // 50 - 15
        expect(updatedProduct.updatedBy).toBe('user-123');
      });

      it('should throw InsufficientStockError when trying to reserve more than available', () => {
        expect(() => product.reserveStock(50, 'user-123')) // Only 45 available
          .toThrow(InsufficientStockError);
      });
    });

    describe('releaseReservedStock', () => {
      it('should release reserved stock successfully', () => {
        const updatedProduct = product.releaseReservedStock(3, 'user-123');

        expect(updatedProduct.reservedStock).toBe(2); // 5 - 3
        expect(updatedProduct.availableStock).toBe(48); // 50 - 2
      });

      it('should throw error when trying to release more than reserved', () => {
        expect(() => product.releaseReservedStock(10, 'user-123')) // Only 5 reserved
          .toThrow(InvalidStockLevelError);
      });
    });

    describe('adjustStock', () => {
      it('should adjust stock to new level', () => {
        const updatedProduct = product.adjustStock(80, 'Inventory count', 'user-123', 'INV-2023');

        expect(updatedProduct.currentStock).toBe(80);
        expect(updatedProduct.stockMovements).toHaveLength(1);
        expect(updatedProduct.stockMovements[0].movementType).toBe('ADJUSTMENT');
        expect(updatedProduct.stockMovements[0].quantity).toBe(30); // |80 - 50|
        expect(updatedProduct.stockMovements[0].previousStock).toBe(50);
        expect(updatedProduct.stockMovements[0].newStock).toBe(80);
      });

      it('should throw error for negative stock adjustment', () => {
        expect(() => product.adjustStock(-1, 'Invalid', 'user-123')).toThrow(InvalidStockLevelError);
      });
    });
  });

  describe('Update Methods', () => {
    describe('updateBasicInfo', () => {
      it('should update basic product information', () => {
        const updates = {
          name: 'Updated Product Name',
          description: 'Updated description',
          category: ProductCategory.ELECTRONICS,
          weight: 1.2,
          tags: ['updated', 'new'],
        };

        const updatedProduct = product.updateBasicInfo(updates, 'user-456');

        expect(updatedProduct.name).toBe('Updated Product Name');
        expect(updatedProduct.description).toBe('Updated description');
        expect(updatedProduct.category).toBe(ProductCategory.ELECTRONICS);
        expect(updatedProduct.weight).toBe(1.2);
        expect(updatedProduct.tags).toEqual(['updated', 'new']);
        expect(updatedProduct.updatedBy).toBe('user-456');
      });

      it('should validate updated information', () => {
        expect(() => product.updateBasicInfo({ name: '' }, 'user-123')).toThrow(ProductValidationError);

        expect(() => product.updateBasicInfo({ weight: -1 }, 'user-123')).toThrow(ProductValidationError);
      });
    });

    describe('updateStockLevels', () => {
      it('should update stock levels', () => {
        const updates = {
          minStockLevel: 15,
          maxStockLevel: 150,
          reorderLevel: 25,
        };

        const updatedProduct = product.updateStockLevels(updates, 'user-456');

        expect(updatedProduct.minStockLevel).toBe(15);
        expect(updatedProduct.maxStockLevel).toBe(150);
        expect(updatedProduct.reorderLevel).toBe(25);
        expect(updatedProduct.updatedBy).toBe('user-456');
      });

      it('should validate stock level relationships', () => {
        expect(() => product.updateStockLevels({ minStockLevel: 200, maxStockLevel: 100 }, 'user-123')).toThrow(
          InvalidStockLevelError
        );
      });
    });

    describe('updateSupplierInfo', () => {
      it('should update supplier information', () => {
        const updates = {
          supplierId: 'new-supplier-789',
          supplierProductCode: 'NEW-CODE-123',
        };

        const updatedProduct = product.updateSupplierInfo(updates, 'user-456');

        expect(updatedProduct.supplierId).toBe('new-supplier-789');
        expect(updatedProduct.supplierProductCode).toBe('NEW-CODE-123');
        expect(updatedProduct.updatedBy).toBe('user-456');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('toPersistence', () => {
      it('should convert to persistence format', () => {
        const persistence = product.toPersistence();

        expect(persistence.id).toBe(product.id);
        expect(persistence.sku).toBe(product.sku);
        expect(persistence.name).toBe(product.name);
        expect(persistence.costPrice).toBe(product.costPrice.amount);
        expect(persistence.costPriceCurrency).toBe(product.costPrice.currency);
        expect(persistence.sellingPrice).toBe(product.sellingPrice.amount);
        expect(persistence.sellingPriceCurrency).toBe(product.sellingPrice.currency);
        expect(persistence.currentStock).toBe(product.currentStock);
        expect(persistence.availableStock).toBe(product.availableStock);
        expect(persistence.length).toBe(product.dimensions?.length);
        expect(persistence.width).toBe(product.dimensions?.width);
        expect(persistence.height).toBe(product.dimensions?.height);
        expect(persistence.tags).toEqual(product.tags);
        expect(persistence.priceHistory).toEqual(product.priceHistory);
        expect(persistence.stockMovements).toEqual(product.stockMovements);
      });
    });

    describe('getDisplayInfo', () => {
      it('should return safe display information', () => {
        const displayInfo = product.getDisplayInfo();

        expect(displayInfo.id).toBe(product.id);
        expect(displayInfo.sku).toBe(product.sku);
        expect(displayInfo.name).toBe(product.name);
        expect(displayInfo.costPrice).toBe('$10.00');
        expect(displayInfo.sellingPrice).toBe('$15.00');
        expect(displayInfo.profitMargin).toBe(50);
        expect(displayInfo.markup).toBe(50);
        expect(displayInfo.stockStatus).toBe('In Stock');
        expect(displayInfo.needsReorder).toBe(false);
        expect(displayInfo.canBeSold).toBe(false);
      });
    });
  });

  describe('Immutability', () => {
    it('should be immutable after creation', () => {
      expect(Object.isFrozen(product)).toBe(true);
    });

    it('should return new instances for all operations', () => {
      const original = product;

      const activated = original.activate('user-123');
      const priceUpdated = original.updateCostPrice(
        Money.fromDecimal(12.0, 'USD'),
        PriceChangeReason.COST_UPDATE,
        'user-123'
      );
      const stockAdded = original.addStock(10, 'Restock', 'user-123');
      const infoUpdated = original.updateBasicInfo({ name: 'New Name' }, 'user-123');

      expect(activated).not.toBe(original);
      expect(priceUpdated).not.toBe(original);
      expect(stockAdded).not.toBe(original);
      expect(infoUpdated).not.toBe(original);

      // Original should remain unchanged
      expect(original.status).toBe(ProductStatus.PENDING_APPROVAL);
      expect(original.costPrice.equals(Money.fromDecimal(10.0, 'USD'))).toBe(true);
      expect(original.currentStock).toBe(50);
      expect(original.name).toBe('Test Product');
    });

    it('should not allow direct mutation of arrays', () => {
      const tags = product.tags;
      const originalLength = tags.length;

      tags.push('new-tag');

      expect(product.tags).toHaveLength(originalLength);
      expect(product.tags).not.toContain('new-tag');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      try {
        Product.create({ ...validProductProps, sku: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidSKUError);
        expect((error as InvalidSKUError).message).toContain('SKU cannot be empty');
      }
    });

    it('should provide specific error types for different scenarios', () => {
      expect(() => Product.create({ ...validProductProps, sku: '' })).toThrow(InvalidSKUError);

      expect(() => Product.create({ ...validProductProps, barcode: '123' })).toThrow(InvalidBarcodeError);

      expect(() => Product.create({ ...validProductProps, minStockLevel: -1 })).toThrow(InvalidStockLevelError);

      expect(() => product.removeStock(100, 'Test', 'user-123')).toThrow(InsufficientStockError);

      const discontinuedProduct = product.discontinue('user-123');
      expect(() => discontinuedProduct.activate('user-123')).toThrow(ProductStatusError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero cost price calculations', () => {
      const props = {
        ...validProductProps,
        costPrice: Money.zero('USD'),
        sellingPrice: Money.fromDecimal(10.0, 'USD'),
      };
      const zeroProduct = Product.create(props);

      expect(zeroProduct.getProfitMargin()).toBe(0);
      expect(zeroProduct.getMarkup()).toBe(0);
    });

    it('should handle products with all stock reserved', () => {
      const props = {
        ...validProductProps,
        currentStock: 10,
        reservedStock: 10,
      };
      const fullyReservedProduct = Product.create(props);

      expect(fullyReservedProduct.availableStock).toBe(0);
      expect(fullyReservedProduct.isOutOfStock()).toBe(true);
      expect(fullyReservedProduct.canBeSold()).toBe(false);
    });

    it('should handle very large stock quantities', () => {
      const largeQuantity = 1000000;
      const updatedProduct = product.addStock(largeQuantity, 'Bulk purchase', 'user-123');

      expect(updatedProduct.currentStock).toBe(50 + largeQuantity);
      expect(updatedProduct.isOverstocked()).toBe(true);
    });

    it('should handle multiple rapid price changes', () => {
      let updatedProduct = product;

      for (let i = 1; i <= 5; i++) {
        updatedProduct = updatedProduct.updateSellingPrice(
          Money.fromDecimal(15 + i, 'USD'),
          PriceChangeReason.MARKET_ADJUSTMENT,
          'user-123'
        );
      }

      expect(updatedProduct.priceHistory).toHaveLength(5);
      expect(updatedProduct.sellingPrice.equals(Money.fromDecimal(20.0, 'USD'))).toBe(true);
    });

    it('should maintain audit trail through multiple updates', () => {
      const productWithHistory = product
        .updateSellingPrice(Money.fromDecimal(18.0, 'USD'), PriceChangeReason.MARKET_ADJUSTMENT, 'user-1')
        .addStock(20, 'Restock', 'user-2')
        .updateBasicInfo({ name: 'Updated Name' }, 'user-3')
        .removeStock(15, 'Sale', 'user-4');

      expect(productWithHistory.priceHistory).toHaveLength(1);
      expect(productWithHistory.stockMovements).toHaveLength(2);
      expect(productWithHistory.updatedBy).toBe('user-4');
      expect(productWithHistory.updatedAt).toBeInstanceOf(Date);
    });
  });
});
