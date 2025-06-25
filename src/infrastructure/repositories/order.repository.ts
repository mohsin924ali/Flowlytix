/**
 * SQLite Order Repository Implementation - Step 1: Core Structure
 *
 * Concrete implementation of OrderRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for Order entities.
 * Implements core CRUD operations with proper error handling.
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema (no JSON serialization)
 * - Follows same patterns as CustomerRepository for consistency
 * - Handles Order aggregate root with OrderItems
 *
 * @domain Order Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step 1: Core Structure Only
 */

import {
  OrderRepository,
  OrderRepositoryError,
  type OrderSearchCriteria,
  type OrderSortOptions,
  type PaginationOptions,
  type PaginatedOrderResult,
  type OrderStatistics,
  type CustomerOrderSummary,
  type ProductSalesSummary,
} from '../../domain/repositories/order.repository';
import {
  Order,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderItemStatus,
  PaymentMethod,
} from '../../domain/entities/order';
import { Money } from '../../domain/value-objects/money';
import { DatabaseConnection } from '../database/connection';
import Database from 'better-sqlite3';

/**
 * Custom error for order not found scenarios
 */
export class OrderNotFoundError extends OrderRepositoryError {
  constructor(orderId: string, agencyId?: string) {
    super(`Order not found: ${orderId}${agencyId ? ` in agency ${agencyId}` : ''}`, 'ORDER_NOT_FOUND');
  }
}

/**
 * Custom error for order already exists scenarios
 */
export class OrderAlreadyExistsError extends OrderRepositoryError {
  constructor(orderNumber: string, agencyId: string) {
    super(`Order already exists with number ${orderNumber} in agency ${agencyId}`, 'ORDER_ALREADY_EXISTS');
  }
}

/**
 * SQLite Order Repository Implementation
 *
 * Provides persistent storage for Order entities using SQLite database.
 * Implements core OrderRepository interface methods with proper error handling.
 * Uses flat database schema for simplicity and consistency with existing architecture.
 */
export class SqliteOrderRepository implements OrderRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database.Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new OrderRepositoryError('Database connection is required', 'constructor');
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new OrderRepositoryError('Invalid database connection', 'constructor');
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new OrderRepositoryError(
        `Database connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'constructor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = this.db.prepare('SELECT 1').get();
      return result !== undefined;
    } catch (error) {
      return false;
    }
  }

  // ===========================================
  // PLACEHOLDER METHODS (To be implemented in future steps)
  // ===========================================

  async save(order: Order): Promise<Order> {
    try {
      // Validate order object
      if (!order || typeof order !== 'object') {
        throw new OrderRepositoryError('Order object is required', 'save');
      }

      if (!order.id || !order.orderNumber || !order.agencyId) {
        throw new OrderRepositoryError('Order missing required properties (id, orderNumber, agencyId)', 'save');
      }

      // Check if order number already exists in this agency
      const existsStmt = this.db.prepare(`
        SELECT id FROM orders 
        WHERE order_number = ? AND agency_id = ?
      `);

      const existing = existsStmt.get(order.orderNumber, order.agencyId);
      if (existing) {
        throw new OrderAlreadyExistsError(order.orderNumber, order.agencyId);
      }

      // Insert order record
      const insertOrderStmt = this.db.prepare(`
        INSERT INTO orders (
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      // Convert order to persistence format
      const persistence = order.toPersistence();

      insertOrderStmt.run(
        persistence.id,
        persistence.orderNumber,
        Math.floor(persistence.orderDate.getTime() / 1000),
        persistence.deliveryDate ? Math.floor(persistence.deliveryDate.getTime() / 1000) : null,
        persistence.dueDate ? Math.floor(persistence.dueDate.getTime() / 1000) : null,
        persistence.customerId,
        persistence.customerCode,
        persistence.customerName,
        persistence.customerCreditLimit,
        persistence.customerBalance,
        persistence.areaId,
        persistence.areaCode,
        persistence.areaName,
        persistence.workerId,
        persistence.workerName,
        persistence.subtotalAmount,
        persistence.discountPercentage,
        persistence.discountAmount,
        persistence.taxAmount,
        persistence.totalAmount,
        persistence.paymentMethod.toLowerCase(),
        persistence.creditDays,
        persistence.status.toLowerCase(),
        persistence.fulfillmentStatus.toLowerCase(),
        persistence.paymentStatus.toLowerCase(),
        persistence.customerNotes,
        persistence.internalNotes,
        persistence.syncSessionId,
        persistence.mobileDeviceId,
        persistence.createdOffline ? 1 : 0,
        persistence.agencyId,
        persistence.createdBy,
        Math.floor(persistence.createdAt.getTime() / 1000),
        persistence.updatedAt
          ? Math.floor(persistence.updatedAt.getTime() / 1000)
          : Math.floor(persistence.createdAt.getTime() / 1000),
        persistence.syncedAt ? Math.floor(persistence.syncedAt.getTime() / 1000) : null
      );

      // Insert order items
      if (order.items && order.items.length > 0) {
        const insertItemStmt = this.db.prepare(`
          INSERT INTO order_items (
            id, order_id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `);

        for (const item of order.items) {
          insertItemStmt.run(
            item.id,
            order.id,
            item.productId,
            item.productCode,
            item.productName,
            item.unitPrice.amount,
            item.boxSize,
            item.quantityBoxes,
            item.quantityLoose,
            item.totalUnits,
            item.unitTotal.amount,
            item.discountPercentage,
            item.discountAmount.amount,
            item.taxRate,
            item.taxAmount.amount,
            item.itemTotal.amount,
            item.fulfilledBoxes,
            item.fulfilledLoose,
            item.fulfilledUnits,
            item.status.toLowerCase(),
            item.notes,
            Math.floor(persistence.createdAt.getTime() / 1000),
            Math.floor(persistence.createdAt.getTime() / 1000)
          );
        }
      }

      return order;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to save order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  async update(order: Order): Promise<Order> {
    try {
      // Validate order object
      if (!order || typeof order !== 'object') {
        throw new OrderRepositoryError('Order object is required', 'update');
      }

      if (!order.id || !order.orderNumber || !order.agencyId) {
        throw new OrderRepositoryError('Order missing required properties (id, orderNumber, agencyId)', 'update');
      }

      // Check if order exists in the specified agency
      const existsStmt = this.db.prepare(`
        SELECT id FROM orders 
        WHERE id = ? AND agency_id = ?
      `);

      const existing = existsStmt.get(order.id, order.agencyId);
      if (!existing) {
        throw new OrderNotFoundError(`Order with ID '${order.id}' not found in agency '${order.agencyId}'`);
      }

      const persistence = order.toPersistence();
      const transaction = this.db.transaction(() => {
        // Update order record
        const updateOrderStmt = this.db.prepare(`
          UPDATE orders SET
            order_number = ?,
            order_date = ?,
            delivery_date = ?,
            due_date = ?,
            customer_id = ?,
            customer_code = ?,
            customer_name = ?,
            customer_credit_limit = ?,
            customer_balance = ?,
            area_id = ?,
            area_code = ?,
            area_name = ?,
            worker_id = ?,
            worker_name = ?,
            subtotal_amount = ?,
            discount_percentage = ?,
            discount_amount = ?,
            tax_amount = ?,
            total_amount = ?,
            payment_method = ?,
            credit_days = ?,
            status = ?,
            fulfillment_status = ?,
            payment_status = ?,
            customer_notes = ?,
            internal_notes = ?,
            sync_session_id = ?,
            mobile_device_id = ?,
            created_offline = ?,
            updated_at = ?
          WHERE id = ? AND agency_id = ?
        `);

        updateOrderStmt.run(
          persistence.orderNumber,
          Math.floor(persistence.orderDate.getTime() / 1000),
          persistence.deliveryDate ? Math.floor(persistence.deliveryDate.getTime() / 1000) : null,
          persistence.dueDate ? Math.floor(persistence.dueDate.getTime() / 1000) : null,
          persistence.customerId,
          persistence.customerCode,
          persistence.customerName,
          persistence.customerCreditLimit,
          persistence.customerBalance,
          persistence.areaId,
          persistence.areaCode,
          persistence.areaName,
          persistence.workerId,
          persistence.workerName,
          persistence.subtotalAmount,
          persistence.discountPercentage,
          persistence.discountAmount,
          persistence.taxAmount,
          persistence.totalAmount,
          persistence.paymentMethod.toLowerCase(),
          persistence.creditDays,
          persistence.status.toLowerCase(),
          persistence.fulfillmentStatus.toLowerCase(),
          persistence.paymentStatus.toLowerCase(),
          persistence.customerNotes,
          persistence.internalNotes,
          persistence.syncSessionId,
          persistence.mobileDeviceId,
          persistence.createdOffline ? 1 : 0,
          persistence.updatedAt ? Math.floor(persistence.updatedAt.getTime() / 1000) : Math.floor(Date.now() / 1000),
          persistence.id,
          persistence.agencyId
        );

        // Delete existing order items
        const deleteItemsStmt = this.db.prepare(`
          DELETE FROM order_items WHERE order_id = ?
        `);
        deleteItemsStmt.run(order.id);

        // Insert updated order items
        const insertItemStmt = this.db.prepare(`
          INSERT INTO order_items (
            id, order_id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `);

        for (const item of persistence.items) {
          insertItemStmt.run(
            item.id,
            order.id,
            item.productId,
            item.productCode,
            item.productName,
            item.unitPrice.amount,
            item.boxSize,
            item.quantityBoxes,
            item.quantityLoose,
            item.totalUnits,
            item.unitTotal.amount,
            item.discountPercentage,
            item.discountAmount.amount,
            item.taxRate,
            item.taxAmount.amount,
            item.itemTotal.amount,
            item.fulfilledBoxes,
            item.fulfilledLoose,
            item.fulfilledUnits,
            item.status.toLowerCase(),
            item.notes,
            Math.floor(persistence.createdAt.getTime() / 1000),
            Math.floor(Date.now() / 1000)
          );
        }
      });

      transaction();
      return order;
    } catch (error) {
      if (error instanceof OrderNotFoundError || error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findById(id: string, agencyId: string): Promise<Order | null> {
    try {
      // Validate parameters
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new OrderRepositoryError('Order ID is required', 'findById');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findById');
      }

      const cleanId = id.trim();
      const cleanAgencyId = agencyId.trim();

      // Find order by ID and agency
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE id = ? AND agency_id = ?
      `);

      const orderRow = orderStmt.get(cleanId, cleanAgencyId);
      if (!orderRow) {
        return null;
      }

      // Find order items
      const itemsStmt = this.db.prepare(`
        SELECT 
          id, product_id, product_code, product_name,
          unit_price, box_size, quantity_boxes, quantity_loose, total_units,
          unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
          item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
        FROM order_items 
        WHERE order_id = ?
        ORDER BY id
      `);

      const itemRows = itemsStmt.all(cleanId);

      // Convert database rows to Order entity
      return this.mapRowsToOrder(orderRow, itemRows);
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find order by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByOrderNumber(orderNumber: string, agencyId: string): Promise<Order | null> {
    try {
      // Validate parameters
      if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim() === '') {
        throw new OrderRepositoryError('Order number is required', 'findByOrderNumber');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findByOrderNumber');
      }

      const cleanOrderNumber = orderNumber.trim();
      const cleanAgencyId = agencyId.trim();

      // Find order by order number and agency
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE order_number = ? AND agency_id = ?
      `);

      const orderRow = orderStmt.get(cleanOrderNumber, cleanAgencyId);
      if (!orderRow) {
        return null;
      }

      // Find order items
      const itemsStmt = this.db.prepare(`
        SELECT 
          id, product_id, product_code, product_name,
          unit_price, box_size, quantity_boxes, quantity_loose, total_units,
          unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
          item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
        FROM order_items 
        WHERE order_id = ?
        ORDER BY id
      `);

      const itemRows = itemsStmt.all((orderRow as any).id);

      // Convert database rows to Order entity
      return this.mapRowsToOrder(orderRow, itemRows);
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find order by order number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByOrderNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  async existsByOrderNumber(orderNumber: string, agencyId: string, excludeOrderId?: string): Promise<boolean> {
    try {
      // Validate parameters
      if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim() === '') {
        throw new OrderRepositoryError('Order number is required', 'existsByOrderNumber');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'existsByOrderNumber');
      }

      const cleanOrderNumber = orderNumber.trim();
      const cleanAgencyId = agencyId.trim();

      let sql = `
        SELECT 1 FROM orders 
        WHERE order_number = ? AND agency_id = ?
      `;
      const params: any[] = [cleanOrderNumber, cleanAgencyId];

      // Exclude specific order ID if provided
      if (excludeOrderId && excludeOrderId.trim() !== '') {
        sql += ' AND id != ?';
        params.push(excludeOrderId.trim());
      }

      sql += ' LIMIT 1';

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params);

      return result !== undefined;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to check order existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByOrderNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteById(id: string, agencyId: string): Promise<boolean> {
    try {
      // Validate parameters
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new OrderRepositoryError('Order ID is required', 'deleteById');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'deleteById');
      }

      const cleanId = id.trim();
      const cleanAgencyId = agencyId.trim();

      // Check if order exists in the specified agency
      const existsStmt = this.db.prepare(`
        SELECT 1 FROM orders 
        WHERE id = ? AND agency_id = ?
      `);

      const exists = existsStmt.get(cleanId, cleanAgencyId);
      if (!exists) {
        return false; // Order not found or doesn't belong to this agency
      }

      // Delete order and items in transaction
      const transaction = this.db.transaction(() => {
        // Delete order items first (due to foreign key)
        const deleteItemsStmt = this.db.prepare(`
          DELETE FROM order_items WHERE order_id = ?
        `);
        deleteItemsStmt.run(cleanId);

        // Delete order
        const deleteOrderStmt = this.db.prepare(`
          DELETE FROM orders 
          WHERE id = ? AND agency_id = ?
        `);
        const result = deleteOrderStmt.run(cleanId, cleanAgencyId);

        return result.changes > 0;
      });

      return transaction();
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to delete order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'deleteById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async search(
    criteria: OrderSearchCriteria,
    sort?: OrderSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedOrderResult> {
    try {
      // Validate agency ID
      if (!criteria.agencyId || typeof criteria.agencyId !== 'string' || criteria.agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'search');
      }

      // Validate pagination
      if (pagination) {
        if (pagination.page < 1 || pagination.limit < 1) {
          throw new OrderRepositoryError('Invalid pagination parameters', 'search');
        }
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      // Build WHERE conditions and parameters
      const conditions: string[] = ['agency_id = ?'];
      const params: any[] = [criteria.agencyId.trim()];

      // Customer filter
      if (criteria.customerId) {
        conditions.push('customer_id = ?');
        params.push(criteria.customerId);
      }

      if (criteria.customerCode) {
        conditions.push('customer_code = ?');
        params.push(criteria.customerCode);
      }

      // Status filters
      if (criteria.status && criteria.status.length > 0) {
        const statusPlaceholders = criteria.status.map(() => '?').join(', ');
        conditions.push(`status IN (${statusPlaceholders})`);
        params.push(...criteria.status.map((s) => s.toLowerCase()));
      }

      if (criteria.fulfillmentStatus && criteria.fulfillmentStatus.length > 0) {
        const statusPlaceholders = criteria.fulfillmentStatus.map(() => '?').join(', ');
        conditions.push(`fulfillment_status IN (${statusPlaceholders})`);
        params.push(...criteria.fulfillmentStatus.map((s) => s.toLowerCase()));
      }

      if (criteria.paymentStatus && criteria.paymentStatus.length > 0) {
        const statusPlaceholders = criteria.paymentStatus.map(() => '?').join(', ');
        conditions.push(`payment_status IN (${statusPlaceholders})`);
        params.push(...criteria.paymentStatus.map((s) => s.toLowerCase()));
      }

      // Worker and area filters
      if (criteria.workerId) {
        conditions.push('worker_id = ?');
        params.push(criteria.workerId);
      }

      if (criteria.areaId) {
        conditions.push('area_id = ?');
        params.push(criteria.areaId);
      }

      // Date range filters
      if (criteria.orderDateFrom) {
        conditions.push('order_date >= ?');
        params.push(Math.floor(criteria.orderDateFrom.getTime() / 1000));
      }

      if (criteria.orderDateTo) {
        conditions.push('order_date <= ?');
        params.push(Math.floor(criteria.orderDateTo.getTime() / 1000));
      }

      if (criteria.deliveryDateFrom) {
        conditions.push('delivery_date >= ?');
        params.push(Math.floor(criteria.deliveryDateFrom.getTime() / 1000));
      }

      if (criteria.deliveryDateTo) {
        conditions.push('delivery_date <= ?');
        params.push(Math.floor(criteria.deliveryDateTo.getTime() / 1000));
      }

      // Amount range filters
      if (criteria.totalAmountMin !== undefined) {
        conditions.push('total_amount >= ?');
        params.push(criteria.totalAmountMin);
      }

      if (criteria.totalAmountMax !== undefined) {
        conditions.push('total_amount <= ?');
        params.push(criteria.totalAmountMax);
      }

      // Text search
      if (criteria.searchText) {
        conditions.push('(customer_name LIKE ? OR order_number LIKE ? OR customer_notes LIKE ?)');
        const searchPattern = `%${criteria.searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Order number filter
      if (criteria.orderNumber) {
        conditions.push('order_number = ?');
        params.push(criteria.orderNumber);
      }

      // Product filter (requires join with order_items)
      if (criteria.productId) {
        conditions.push('id IN (SELECT DISTINCT order_id FROM order_items WHERE product_id = ?)');
        params.push(criteria.productId);
      }

      // Offline/sync filters
      if (criteria.createdOffline !== undefined) {
        conditions.push('created_offline = ?');
        params.push(criteria.createdOffline ? 1 : 0);
      }

      if (criteria.syncSessionId) {
        conditions.push('sync_session_id = ?');
        params.push(criteria.syncSessionId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      let orderClause = 'ORDER BY created_at DESC';
      if (sort) {
        const fieldMap: Record<string, string> = {
          orderDate: 'order_date',
          orderNumber: 'order_number',
          customerName: 'customer_name',
          totalAmount: 'total_amount',
          status: 'status',
          createdAt: 'created_at',
        };

        const field = fieldMap[sort.field] || 'created_at';
        const direction = sort.direction === 'ASC' ? 'ASC' : 'DESC';
        orderClause = `ORDER BY ${field} ${direction}`;
      }

      // Get total count
      const countSql = `
        SELECT COUNT(*) as total 
        FROM orders 
        ${whereClause}
      `;

      const countStmt = this.db.prepare(countSql);
      const countResult = countStmt.get(...params) as { total: number };
      const total = countResult.total;

      // Get orders
      const ordersSql = `
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const ordersStmt = this.db.prepare(ordersSql);
      const orderRows = ordersStmt.all(...params, limit, offset) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        orders,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to search orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByCustomerId(customerId: string, agencyId: string, limit?: number): Promise<Order[]> {
    try {
      // Validate parameters
      if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
        throw new OrderRepositoryError('Customer ID is required', 'findByCustomerId');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findByCustomerId');
      }

      const cleanCustomerId = customerId.trim();
      const cleanAgencyId = agencyId.trim();
      const orderLimit = limit || 100;

      // Find orders by customer ID and agency, ordered by most recent first
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE customer_id = ? AND agency_id = ?
        ORDER BY order_date DESC, created_at DESC
        LIMIT ?
      `);

      const orderRows = orderStmt.all(cleanCustomerId, cleanAgencyId, orderLimit) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders by customer ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByCustomerId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByWorkerId(workerId: string, agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<Order[]> {
    try {
      // Validate parameters
      if (!workerId || typeof workerId !== 'string' || workerId.trim() === '') {
        throw new OrderRepositoryError('Worker ID is required', 'findByWorkerId');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findByWorkerId');
      }

      const cleanWorkerId = workerId.trim();
      const cleanAgencyId = agencyId.trim();

      // Build query conditions
      const conditions = ['worker_id = ?', 'agency_id = ?'];
      const params: any[] = [cleanWorkerId, cleanAgencyId];

      // Add date range filters if provided
      if (dateFrom) {
        conditions.push('order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        conditions.push('order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Find orders by worker ID and agency, with optional date filtering
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        ${whereClause}
        ORDER BY order_date DESC, created_at DESC
      `);

      const orderRows = orderStmt.all(...params) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders by worker ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByWorkerId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByAreaId(areaId: string, agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<Order[]> {
    try {
      // Validate parameters
      if (!areaId || typeof areaId !== 'string' || areaId.trim() === '') {
        throw new OrderRepositoryError('Area ID is required', 'findByAreaId');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findByAreaId');
      }

      const cleanAreaId = areaId.trim();
      const cleanAgencyId = agencyId.trim();

      // Build query conditions
      const conditions = ['area_id = ?', 'agency_id = ?'];
      const params: any[] = [cleanAreaId, cleanAgencyId];

      // Add date range filters if provided
      if (dateFrom) {
        conditions.push('order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        conditions.push('order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Find orders by area ID and agency, with optional date filtering
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        ${whereClause}
        ORDER BY order_date DESC, created_at DESC
      `);

      const orderRows = orderStmt.all(...params) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders by area ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAreaId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findPendingOrders(agencyId: string, limit?: number): Promise<Order[]> {
    try {
      // Validate parameters
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findPendingOrders');
      }

      const cleanAgencyId = agencyId.trim();
      const orderLimit = limit || 100;

      // Find orders with pending status
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE agency_id = ? AND status = 'pending'
        ORDER BY order_date ASC, created_at ASC
        LIMIT ?
      `);

      const orderRows = orderStmt.all(cleanAgencyId, orderLimit) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find pending orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findPendingOrders',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findOverdueOrders(agencyId: string, asOfDate?: Date): Promise<Order[]> {
    try {
      // Validate parameters
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findOverdueOrders');
      }

      const cleanAgencyId = agencyId.trim();
      const checkDate = asOfDate || new Date();
      const checkTimestamp = Math.floor(checkDate.getTime() / 1000);

      // Find orders that are overdue based on due_date
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE agency_id = ? 
        AND due_date IS NOT NULL 
        AND due_date < ?
        AND status IN ('pending', 'confirmed')
        ORDER BY due_date ASC
      `);

      const orderRows = orderStmt.all(cleanAgencyId, checkTimestamp) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find overdue orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOverdueOrders',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findOrdersRequiringFulfillment(agencyId: string, limit?: number): Promise<Order[]> {
    try {
      // Validate parameters
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findOrdersRequiringFulfillment');
      }

      const cleanAgencyId = agencyId.trim();
      const orderLimit = limit || 100;

      // Find orders that require fulfillment (confirmed status with pending or partial fulfillment)
      const orderStmt = this.db.prepare(`
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE agency_id = ? 
        AND status = 'confirmed'
        AND fulfillment_status IN ('pending', 'partial')
        ORDER BY order_date ASC, created_at ASC
        LIMIT ?
      `);

      const orderRows = orderStmt.all(cleanAgencyId, orderLimit) as any[];

      // Convert to Order entities
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        // Get order items for each order
        const itemsStmt = this.db.prepare(`
          SELECT 
            id, product_id, product_code, product_name,
            unit_price, box_size, quantity_boxes, quantity_loose, total_units,
            unit_total, discount_percentage, discount_amount, tax_rate, tax_amount,
            item_total, fulfilled_boxes, fulfilled_loose, fulfilled_units, status, notes
          FROM order_items 
          WHERE order_id = ?
          ORDER BY id
        `);

        const itemRows = itemsStmt.all(orderRow.id);
        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders requiring fulfillment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOrdersRequiringFulfillment',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getOrderStatistics(agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<OrderStatistics> {
    try {
      // Validate agency ID
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'getOrderStatistics');
      }

      const cleanAgencyId = agencyId.trim();

      // Build date filter conditions
      const dateConditions: string[] = [];
      const params: any[] = [cleanAgencyId];

      if (dateFrom) {
        dateConditions.push('order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        dateConditions.push('order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

      // Get comprehensive order statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as totalOrders,
          COALESCE(SUM(total_amount), 0) as totalValue,
          COALESCE(AVG(total_amount), 0) as averageOrderValue,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmedOrders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as deliveredOrders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders,
          COUNT(CASE WHEN due_date IS NOT NULL AND due_date < ? THEN 1 END) as overdueOrders
        FROM orders 
        WHERE agency_id = ? ${dateFilter}
      `;

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const statsParams = [currentTimestamp, ...params];

      const statsStmt = this.db.prepare(statsQuery);
      const stats = statsStmt.get(...statsParams) as any;

      return {
        totalOrders: stats.totalOrders || 0,
        totalValue: stats.totalValue || 0,
        averageOrderValue: stats.averageOrderValue || 0,
        pendingOrders: stats.pendingOrders || 0,
        confirmedOrders: stats.confirmedOrders || 0,
        deliveredOrders: stats.deliveredOrders || 0,
        cancelledOrders: stats.cancelledOrders || 0,
        overdueOrders: stats.overdueOrders || 0,
      };
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to get order statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getOrderStatistics',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getCustomerOrderSummaries(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit?: number
  ): Promise<CustomerOrderSummary[]> {
    try {
      // Validate agency ID
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'getCustomerOrderSummaries');
      }

      const cleanAgencyId = agencyId.trim();
      const orderLimit = limit || 100;

      // Build date filter conditions
      const dateConditions: string[] = [];
      const params: any[] = [cleanAgencyId];

      if (dateFrom) {
        dateConditions.push('order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        dateConditions.push('order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

      // Get customer order summaries
      const summariesQuery = `
        SELECT 
          customer_id,
          customer_code,
          customer_name,
          COUNT(*) as totalOrders,
          COALESCE(SUM(total_amount), 0) as totalValue,
          COALESCE(AVG(total_amount), 0) as averageOrderValue,
          MAX(order_date) as lastOrderDate,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrdersCount,
          COUNT(CASE WHEN due_date IS NOT NULL AND due_date < ? THEN 1 END) as overdueOrdersCount
        FROM orders 
        WHERE agency_id = ? ${dateFilter}
        GROUP BY customer_id, customer_code, customer_name
        ORDER BY totalValue DESC
        LIMIT ?
      `;

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const summariesParams = [currentTimestamp, ...params, orderLimit];

      const summariesStmt = this.db.prepare(summariesQuery);
      const summaries = summariesStmt.all(...summariesParams) as any[];

      return summaries.map((summary) => ({
        customerId: summary.customer_id,
        customerCode: summary.customer_code,
        customerName: summary.customer_name,
        totalOrders: summary.totalOrders || 0,
        totalValue: summary.totalValue || 0,
        averageOrderValue: summary.averageOrderValue || 0,
        lastOrderDate: summary.lastOrderDate ? new Date(summary.lastOrderDate * 1000) : null,
        pendingOrdersCount: summary.pendingOrdersCount || 0,
        overdueOrdersCount: summary.overdueOrdersCount || 0,
      }));
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to get customer order summaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getCustomerOrderSummaries',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getProductSalesSummaries(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit?: number
  ): Promise<ProductSalesSummary[]> {
    try {
      // Validate agency ID
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'getProductSalesSummaries');
      }

      const cleanAgencyId = agencyId.trim();
      const orderLimit = limit || 100;

      // Build date filter conditions
      const dateConditions: string[] = [];
      const params: any[] = [cleanAgencyId];

      if (dateFrom) {
        dateConditions.push('o.order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        dateConditions.push('o.order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

      // Get product sales summaries from order items
      const summariesQuery = `
        SELECT 
          oi.product_id,
          oi.product_code,
          oi.product_name,
          SUM(oi.total_units) as totalQuantityOrdered,
          SUM(CASE WHEN o.fulfillment_status = 'completed' THEN oi.fulfilled_units ELSE 0 END) as totalQuantityDelivered,
          SUM(oi.item_total) as totalSalesValue,
          COUNT(DISTINCT o.id) as orderCount,
          AVG(oi.total_units) as averageOrderQuantity
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.agency_id = ? ${dateFilter}
        GROUP BY oi.product_id, oi.product_code, oi.product_name
        ORDER BY totalSalesValue DESC
        LIMIT ?
      `;

      params.push(orderLimit);

      const summariesStmt = this.db.prepare(summariesQuery);
      const summaries = summariesStmt.all(...params) as any[];

      return summaries.map((summary) => ({
        productId: summary.product_id,
        productCode: summary.product_code,
        productName: summary.product_name,
        totalQuantityOrdered: summary.totalQuantityOrdered || 0,
        totalQuantityDelivered: summary.totalQuantityDelivered || 0,
        totalSalesValue: summary.totalSalesValue || 0,
        orderCount: summary.orderCount || 0,
        averageOrderQuantity: summary.averageOrderQuantity || 0,
      }));
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to get product sales summaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getProductSalesSummaries',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Maps database rows to Order entity
   */
  private mapRowsToOrder(orderRow: any, itemRows: any[]): Order {
    // Map order items
    const items = itemRows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productCode: item.product_code,
      productName: item.product_name,
      unitPrice: Money.fromDecimal(item.unit_price, 'USD'),
      boxSize: item.box_size,
      quantityBoxes: item.quantity_boxes,
      quantityLoose: item.quantity_loose,
      totalUnits: item.total_units,
      unitTotal: Money.fromDecimal(item.unit_total, 'USD'),
      discountPercentage: item.discount_percentage,
      discountAmount: Money.fromDecimal(item.discount_amount, 'USD'),
      taxRate: item.tax_rate,
      taxAmount: Money.fromDecimal(item.tax_amount, 'USD'),
      itemTotal: Money.fromDecimal(item.item_total, 'USD'),
      fulfilledBoxes: item.fulfilled_boxes,
      fulfilledLoose: item.fulfilled_loose,
      fulfilledUnits: item.fulfilled_units,
      status: item.status.toUpperCase() as OrderItemStatus,
      notes: item.notes || undefined,
    }));

    // Create persistence object
    const persistence = {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      orderDate: new Date(orderRow.order_date * 1000),
      deliveryDate: orderRow.delivery_date ? new Date(orderRow.delivery_date * 1000) : null,
      dueDate: orderRow.due_date ? new Date(orderRow.due_date * 1000) : null,
      customerId: orderRow.customer_id,
      customerCode: orderRow.customer_code,
      customerName: orderRow.customer_name,
      customerCreditLimit: orderRow.customer_credit_limit,
      customerBalance: orderRow.customer_balance,
      areaId: orderRow.area_id,
      areaCode: orderRow.area_code,
      areaName: orderRow.area_name,
      workerId: orderRow.worker_id,
      workerName: orderRow.worker_name,
      subtotalAmount: orderRow.subtotal_amount,
      discountPercentage: orderRow.discount_percentage,
      discountAmount: orderRow.discount_amount,
      taxAmount: orderRow.tax_amount,
      totalAmount: orderRow.total_amount,
      paymentMethod: orderRow.payment_method.toUpperCase() as PaymentMethod,
      creditDays: orderRow.credit_days,
      status: orderRow.status.toUpperCase() as OrderStatus,
      fulfillmentStatus: orderRow.fulfillment_status.toUpperCase() as OrderFulfillmentStatus,
      paymentStatus: orderRow.payment_status.toUpperCase() as OrderPaymentStatus,
      customerNotes: orderRow.customer_notes,
      internalNotes: orderRow.internal_notes,
      syncSessionId: orderRow.sync_session_id,
      mobileDeviceId: orderRow.mobile_device_id,
      createdOffline: orderRow.created_offline === 1,
      agencyId: orderRow.agency_id,
      createdBy: orderRow.created_by,
      createdAt: new Date(orderRow.created_at * 1000),
      updatedBy: null,
      updatedAt: orderRow.updated_at ? new Date(orderRow.updated_at * 1000) : null,
      syncedAt: orderRow.synced_at ? new Date(orderRow.synced_at * 1000) : null,
      items,
    };

    return Order.fromPersistence(persistence);
  }

  async getNextOrderNumber(agencyId: string, prefix?: string): Promise<string> {
    try {
      // Validate agency ID
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'getNextOrderNumber');
      }

      const cleanAgencyId = agencyId.trim();
      const orderPrefix = prefix || 'ORD';
      const currentYear = new Date().getFullYear();

      // Use a transaction to ensure sequence integrity
      const transaction = this.db.transaction(() => {
        // Create or get sequence table for tracking
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS order_sequences (
            agency_id TEXT NOT NULL,
            prefix TEXT NOT NULL,
            year INTEGER NOT NULL,
            last_sequence INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (agency_id, prefix, year)
          )
        `);

        // Get and increment the sequence
        const sequenceKey = `${cleanAgencyId}-${orderPrefix}-${currentYear}`;

        // First, try to get existing sequence
        const getSeqStmt = this.db.prepare(`
          SELECT last_sequence FROM order_sequences 
          WHERE agency_id = ? AND prefix = ? AND year = ?
        `);

        const currentSeq = getSeqStmt.get(cleanAgencyId, orderPrefix, currentYear) as
          | { last_sequence: number }
          | undefined;

        const nextSequence = (currentSeq?.last_sequence || 0) + 1;

        // Update or insert the sequence
        const upsertStmt = this.db.prepare(`
          INSERT OR REPLACE INTO order_sequences (agency_id, prefix, year, last_sequence)
          VALUES (?, ?, ?, ?)
        `);

        upsertStmt.run(cleanAgencyId, orderPrefix, currentYear, nextSequence);

        return nextSequence;
      });

      const nextSequence = transaction();
      const formattedSequence = nextSequence.toString().padStart(6, '0');

      return `${orderPrefix}-${currentYear}-${formattedSequence}`;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to generate order number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getNextOrderNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  async bulkUpdateStatus(orderIds: string[], status: OrderStatus, userId: string, agencyId: string): Promise<number> {
    try {
      // Validate parameters
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new OrderRepositoryError('User ID is required', 'bulkUpdateStatus');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'bulkUpdateStatus');
      }

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return 0; // No orders to update
      }

      const cleanUserId = userId.trim();
      const cleanAgencyId = agencyId.trim();
      const statusValue = status.toLowerCase();
      const updatedAt = Math.floor(Date.now() / 1000);

      // Create placeholders for order IDs
      const placeholders = orderIds.map(() => '?').join(',');

      // Update orders with agency isolation
      const updateQuery = `
        UPDATE orders 
        SET 
          status = ?,
          updated_at = ?
        WHERE 
          id IN (${placeholders})
          AND agency_id = ?
      `;

      const updateParams = [statusValue, updatedAt, ...orderIds, cleanAgencyId];

      const updateStmt = this.db.prepare(updateQuery);
      const result = updateStmt.run(...updateParams);

      return result.changes || 0;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to bulk update order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'bulkUpdateStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  async bulkUpdateFulfillmentStatus(
    orderIds: string[],
    fulfillmentStatus: OrderFulfillmentStatus,
    userId: string,
    agencyId: string
  ): Promise<number> {
    try {
      // Validate parameters
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new OrderRepositoryError('User ID is required', 'bulkUpdateFulfillmentStatus');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'bulkUpdateFulfillmentStatus');
      }

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return 0; // No orders to update
      }

      const cleanUserId = userId.trim();
      const cleanAgencyId = agencyId.trim();
      const fulfillmentStatusValue = fulfillmentStatus.toLowerCase();
      const updatedAt = Math.floor(Date.now() / 1000);

      // Create placeholders for order IDs
      const placeholders = orderIds.map(() => '?').join(',');

      // Update orders with agency isolation
      const updateQuery = `
        UPDATE orders 
        SET 
          fulfillment_status = ?,
          updated_at = ?
        WHERE 
          id IN (${placeholders})
          AND agency_id = ?
      `;

      const updateParams = [fulfillmentStatusValue, updatedAt, ...orderIds, cleanAgencyId];

      const updateStmt = this.db.prepare(updateQuery);
      const result = updateStmt.run(...updateParams);

      return result.changes || 0;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to bulk update fulfillment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'bulkUpdateFulfillmentStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findOrdersContainingProduct(
    productId: string,
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Order[]> {
    try {
      // Validate parameters
      if (!productId || typeof productId !== 'string' || productId.trim() === '') {
        throw new OrderRepositoryError('Product ID is required', 'findOrdersContainingProduct');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findOrdersContainingProduct');
      }

      const cleanProductId = productId.trim();
      const cleanAgencyId = agencyId.trim();

      // Build date filter conditions
      const dateConditions: string[] = [];
      const params: any[] = [cleanProductId, cleanAgencyId];

      if (dateFrom) {
        dateConditions.push('o.order_date >= ?');
        params.push(Math.floor(dateFrom.getTime() / 1000));
      }

      if (dateTo) {
        dateConditions.push('o.order_date <= ?');
        params.push(Math.floor(dateTo.getTime() / 1000));
      }

      const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

      // Find orders containing the specific product
      const orderQuery = `
        SELECT DISTINCT
          o.id, o.order_number, o.order_date, o.delivery_date, o.due_date,
          o.customer_id, o.customer_code, o.customer_name, o.customer_credit_limit, o.customer_balance,
          o.area_id, o.area_code, o.area_name, o.worker_id, o.worker_name,
          o.subtotal_amount, o.discount_percentage, o.discount_amount, o.tax_amount, o.total_amount,
          o.payment_method, o.credit_days, o.status, o.fulfillment_status, o.payment_status,
          o.customer_notes, o.internal_notes, o.sync_session_id, o.mobile_device_id, o.created_offline,
          o.agency_id, o.created_by, o.created_at, o.updated_at, o.synced_at
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.product_id = ? AND o.agency_id = ? ${dateFilter}
        ORDER BY o.order_date DESC
      `;

      const orderStmt = this.db.prepare(orderQuery);
      const orderRows = orderStmt.all(...params) as any[];

      if (orderRows.length === 0) {
        return [];
      }

      // Get order items for each order
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        const itemStmt = this.db.prepare(`
          SELECT * FROM order_items WHERE order_id = ? ORDER BY id
        `);
        const itemRows = itemStmt.all(orderRow.id) as any[];

        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders containing product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOrdersContainingProduct',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findOrdersNeedingSync(agencyId: string, mobileDeviceId?: string): Promise<Order[]> {
    try {
      // Validate agency ID
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'findOrdersNeedingSync');
      }

      const cleanAgencyId = agencyId.trim();

      // Build device filter conditions
      const deviceConditions: string[] = [];
      const params: any[] = [cleanAgencyId];

      if (mobileDeviceId) {
        deviceConditions.push('mobile_device_id = ?');
        params.push(mobileDeviceId.trim());
      }

      const deviceFilter = deviceConditions.length > 0 ? `AND ${deviceConditions.join(' AND ')}` : '';

      // Find orders created offline that haven't been synced yet
      const orderQuery = `
        SELECT 
          id, order_number, order_date, delivery_date, due_date,
          customer_id, customer_code, customer_name, customer_credit_limit, customer_balance,
          area_id, area_code, area_name, worker_id, worker_name,
          subtotal_amount, discount_percentage, discount_amount, tax_amount, total_amount,
          payment_method, credit_days, status, fulfillment_status, payment_status,
          customer_notes, internal_notes, sync_session_id, mobile_device_id, created_offline,
          agency_id, created_by, created_at, updated_at, synced_at
        FROM orders 
        WHERE 
          agency_id = ? 
          AND created_offline = 1 
          AND (sync_session_id IS NULL OR sync_session_id = '')
          ${deviceFilter}
        ORDER BY created_at ASC
      `;

      const orderStmt = this.db.prepare(orderQuery);
      const orderRows = orderStmt.all(...params) as any[];

      if (orderRows.length === 0) {
        return [];
      }

      // Get order items for each order
      const orders: Order[] = [];
      for (const orderRow of orderRows) {
        const itemStmt = this.db.prepare(`
          SELECT * FROM order_items WHERE order_id = ? ORDER BY id
        `);
        const itemRows = itemStmt.all(orderRow.id) as any[];

        const order = this.mapRowsToOrder(orderRow, itemRows);
        orders.push(order);
      }

      return orders;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to find orders needing sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOrdersNeedingSync',
        error instanceof Error ? error : undefined
      );
    }
  }

  async markOrdersAsSynced(orderIds: string[], agencyId: string): Promise<number> {
    try {
      // Validate parameters
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new OrderRepositoryError('Agency ID is required', 'markOrdersAsSynced');
      }

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return 0; // No orders to update
      }

      const cleanAgencyId = agencyId.trim();
      const syncedAt = Math.floor(Date.now() / 1000);
      const syncSessionId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create placeholders for order IDs
      const placeholders = orderIds.map(() => '?').join(',');

      // Mark orders as synced with agency isolation
      const updateQuery = `
        UPDATE orders 
        SET 
          sync_session_id = ?,
          synced_at = ?
        WHERE 
          id IN (${placeholders})
          AND agency_id = ?
          AND created_offline = 1
      `;

      const updateParams = [syncSessionId, syncedAt, ...orderIds, cleanAgencyId];

      const updateStmt = this.db.prepare(updateQuery);
      const result = updateStmt.run(...updateParams);

      return result.changes || 0;
    } catch (error) {
      if (error instanceof OrderRepositoryError) {
        throw error;
      }
      throw new OrderRepositoryError(
        `Failed to mark orders as synced: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'markOrdersAsSynced',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Factory function to create OrderRepository instance
 */
export function createOrderRepository(connection: DatabaseConnection): OrderRepository {
  return new SqliteOrderRepository(connection);
}
