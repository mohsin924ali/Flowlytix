/**
 * Business Entity Schema Definitions
 * Comprehensive ERP system for goods distribution agencies
 * Following enterprise-grade normalization and performance optimization
 */

// Import shipping schema
import { SHIPPING_SCHEMAS } from './shipping-schema';

/**
 * Multi-Agency Management Schema
 * Core table for agency isolation and management
 */
export const AGENCIES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS agencies (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    database_path TEXT NOT NULL UNIQUE,
    
    -- Business information
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    
    -- System configuration
    settings TEXT, -- JSON configuration
    
    -- Status and audit
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT agencies_status_valid CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT agencies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT agencies_database_path_format CHECK (database_path LIKE '%.db')
  ) STRICT;
`;

/**
 * Areas Management Schema
 * Geographic/logical areas for worker assignments and customer mapping
 */
export const AREAS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS areas (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Area information
    area_code TEXT NOT NULL,
    area_name TEXT NOT NULL,
    description TEXT,
    
    -- Geographic data (optional)
    latitude REAL,
    longitude REAL,
    boundaries TEXT, -- JSON polygon coordinates
    
    -- Status and audit
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT areas_status_valid CHECK (status IN ('active', 'inactive')),
    CONSTRAINT areas_code_not_empty CHECK (LENGTH(TRIM(area_code)) > 0),
    CONSTRAINT areas_name_not_empty CHECK (LENGTH(TRIM(area_name)) > 0),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, area_code),
    UNIQUE(agency_id, area_name)
  ) STRICT;
`;

/**
 * Workers Management Schema
 * Field workers, order bookers, and staff management
 */
export const WORKERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS workers (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Worker information
    worker_code TEXT NOT NULL,
    worker_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    
    -- Job assignment
    assigned_area_id TEXT,
    job_title TEXT DEFAULT 'Order Booker',
    employment_type TEXT DEFAULT 'full_time',
    
    -- Authentication for mobile app
    mobile_pin_hash TEXT,
    mobile_pin_salt TEXT,
    last_login_mobile INTEGER,
    
    -- Performance tracking
    target_orders_per_day INTEGER DEFAULT 0,
    commission_rate REAL DEFAULT 0.00,
    
    -- Status and audit
    status TEXT NOT NULL DEFAULT 'active',
    hire_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT workers_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    CONSTRAINT workers_employment_valid CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
    CONSTRAINT workers_code_not_empty CHECK (LENGTH(TRIM(worker_code)) > 0),
    CONSTRAINT workers_name_not_empty CHECK (LENGTH(TRIM(worker_name)) > 0),
    CONSTRAINT workers_commission_positive CHECK (commission_rate >= 0),
    CONSTRAINT workers_target_positive CHECK (target_orders_per_day >= 0),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, worker_code)
  ) STRICT;
`;

/**
 * Customer Management Schema (CRM)
 * Customer database with credit management and area mapping
 */
export const CUSTOMERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS customers (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Customer information
    customer_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    business_name TEXT,
    contact_person TEXT,
    
    -- Contact information
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    
    -- Geographic assignment
    area_id TEXT,
    assigned_worker_id TEXT,
    
    -- Financial information
    credit_limit REAL NOT NULL DEFAULT 0.00,
    current_balance REAL NOT NULL DEFAULT 0.00,
    payment_terms INTEGER DEFAULT 30, -- days
    
    -- Customer categorization
    customer_type TEXT DEFAULT 'regular',
    priority_level TEXT DEFAULT 'normal',
    
    -- Business metrics
    total_orders INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.00,
    last_order_date INTEGER,
    
    -- Status and audit
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT customers_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'blacklisted')),
    CONSTRAINT customers_type_valid CHECK (customer_type IN ('regular', 'wholesale', 'retail', 'distributor')),
    CONSTRAINT customers_priority_valid CHECK (priority_level IN ('low', 'normal', 'high', 'vip')),
    CONSTRAINT customers_code_not_empty CHECK (LENGTH(TRIM(customer_code)) > 0),
    CONSTRAINT customers_name_not_empty CHECK (LENGTH(TRIM(customer_name)) > 0),
    CONSTRAINT customers_credit_positive CHECK (credit_limit >= 0),
    CONSTRAINT customers_payment_terms_positive CHECK (payment_terms > 0),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, customer_code)
  ) STRICT;
`;

/**
 * Product Management Schema
 * Product catalog with pricing and packaging information
 */
export const PRODUCTS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Product information
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    brand TEXT,
    
    -- Packaging information
    unit_of_measure TEXT DEFAULT 'piece',
    box_size INTEGER NOT NULL DEFAULT 1, -- units per box
    weight_per_unit REAL, -- kg
    volume_per_unit REAL, -- liters
    
    -- Pricing information
    unit_price REAL NOT NULL,
    wholesale_price REAL,
    retail_price REAL,
    cost_price REAL,
    
    -- Product specifications
    expiry_period_days INTEGER, -- shelf life
    minimum_order_quantity INTEGER DEFAULT 1,
    maximum_order_quantity INTEGER,
    
    -- Business rules
    allow_loose_packing INTEGER NOT NULL DEFAULT 1, -- boolean
    requires_refrigeration INTEGER NOT NULL DEFAULT 0, -- boolean
    is_taxable INTEGER NOT NULL DEFAULT 1, -- boolean
    tax_rate REAL DEFAULT 0.00,
    
    -- Status and audit
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT products_status_valid CHECK (status IN ('active', 'inactive', 'discontinued')),
    CONSTRAINT products_code_not_empty CHECK (LENGTH(TRIM(product_code)) > 0),
    CONSTRAINT products_name_not_empty CHECK (LENGTH(TRIM(product_name)) > 0),
    CONSTRAINT products_box_size_positive CHECK (box_size > 0),
    CONSTRAINT products_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT products_cost_price_positive CHECK (cost_price IS NULL OR cost_price >= 0),
    CONSTRAINT products_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT products_min_order_positive CHECK (minimum_order_quantity > 0),
    CONSTRAINT products_max_order_valid CHECK (maximum_order_quantity IS NULL OR maximum_order_quantity >= minimum_order_quantity),
    CONSTRAINT products_boolean_loose_packing CHECK (allow_loose_packing IN (0, 1)),
    CONSTRAINT products_boolean_refrigeration CHECK (requires_refrigeration IN (0, 1)),
    CONSTRAINT products_boolean_taxable CHECK (is_taxable IN (0, 1)),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, product_code)
  ) STRICT;
`;

/**
 * Inventory Management Schema
 * Real-time inventory tracking with box and loose unit management
 */
export const INVENTORY_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS inventory (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    -- Stock levels (available for sale)
    available_boxes INTEGER NOT NULL DEFAULT 0,
    available_loose INTEGER NOT NULL DEFAULT 0,
    
    -- Reserved stock (pending orders, allocations)
    reserved_boxes INTEGER NOT NULL DEFAULT 0,
    reserved_loose INTEGER NOT NULL DEFAULT 0,
    
    -- Damaged/expired stock
    damaged_boxes INTEGER NOT NULL DEFAULT 0,
    damaged_loose INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated fields - Note: these will be calculated in application layer
    -- total_available_units and total_reserved_units require box_size from products table
    -- SQLite generated columns cannot use subqueries, so we calculate these in the app
    
    -- Inventory thresholds
    minimum_stock_level INTEGER DEFAULT 0,
    maximum_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 0,
    
    -- Last stock movement
    last_movement_at INTEGER,
    last_movement_type TEXT,
    last_counted_at INTEGER,
    
    -- Audit information
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- Constraints
    CONSTRAINT inventory_available_boxes_positive CHECK (available_boxes >= 0),
    CONSTRAINT inventory_available_loose_positive CHECK (available_loose >= 0),
    CONSTRAINT inventory_reserved_boxes_positive CHECK (reserved_boxes >= 0),
    CONSTRAINT inventory_reserved_loose_positive CHECK (reserved_loose >= 0),
    CONSTRAINT inventory_damaged_boxes_positive CHECK (damaged_boxes >= 0),
    CONSTRAINT inventory_damaged_loose_positive CHECK (damaged_loose >= 0),
    CONSTRAINT inventory_minimum_positive CHECK (minimum_stock_level >= 0),
    CONSTRAINT inventory_reorder_positive CHECK (reorder_point >= 0),
    CONSTRAINT inventory_maximum_valid CHECK (maximum_stock_level IS NULL OR maximum_stock_level >= minimum_stock_level),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Unique constraints
    UNIQUE(agency_id, product_id)
  ) STRICT;
`;

/**
 * Orders Management Schema
 * Main orders table for customer order processing
 */
export const ORDERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    order_number TEXT NOT NULL, -- human-readable order number
    
    -- Order date and timing
    order_date INTEGER NOT NULL,
    delivery_date INTEGER,
    due_date INTEGER,
    
    -- Customer information (denormalized for performance and offline sync)
    customer_id TEXT NOT NULL,
    customer_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_credit_limit REAL NOT NULL,
    customer_balance REAL NOT NULL,
    
    -- Geographic and worker information
    area_id TEXT,
    area_code TEXT NOT NULL,
    area_name TEXT NOT NULL,
    worker_id TEXT,
    worker_name TEXT NOT NULL,
    
    -- Order financial summary
    subtotal_amount REAL NOT NULL DEFAULT 0.00,
    discount_percentage REAL NOT NULL DEFAULT 0.00,
    discount_amount REAL NOT NULL DEFAULT 0.00,
    tax_amount REAL NOT NULL DEFAULT 0.00,
    total_amount REAL NOT NULL DEFAULT 0.00,
    
    -- Payment and credit information
    payment_method TEXT DEFAULT 'credit',
    credit_days INTEGER DEFAULT 30,
    
    -- Order processing status
    status TEXT NOT NULL DEFAULT 'pending',
    fulfillment_status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Notes and comments
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Mobile sync information
    sync_session_id TEXT,
    mobile_device_id TEXT,
    created_offline INTEGER NOT NULL DEFAULT 1, -- boolean
    
    -- Audit information
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT orders_status_valid CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    CONSTRAINT orders_fulfillment_valid CHECK (fulfillment_status IN ('pending', 'picking', 'packed', 'shipped', 'delivered', 'partial')),
    CONSTRAINT orders_payment_valid CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT orders_payment_method_valid CHECK (payment_method IN ('cash', 'credit', 'cheque', 'bank_transfer')),
    CONSTRAINT orders_number_not_empty CHECK (LENGTH(TRIM(order_number)) > 0),
    CONSTRAINT orders_customer_code_not_empty CHECK (LENGTH(TRIM(customer_code)) > 0),
    CONSTRAINT orders_customer_name_not_empty CHECK (LENGTH(TRIM(customer_name)) > 0),
    CONSTRAINT orders_worker_name_not_empty CHECK (LENGTH(TRIM(worker_name)) > 0),
    CONSTRAINT orders_area_code_not_empty CHECK (LENGTH(TRIM(area_code)) > 0),
    CONSTRAINT orders_subtotal_positive CHECK (subtotal_amount >= 0),
    CONSTRAINT orders_discount_percentage_valid CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CONSTRAINT orders_discount_amount_positive CHECK (discount_amount >= 0),
    CONSTRAINT orders_tax_amount_positive CHECK (tax_amount >= 0),
    CONSTRAINT orders_total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT orders_credit_days_positive CHECK (credit_days >= 0),
    CONSTRAINT orders_boolean_offline CHECK (created_offline IN (0, 1)),
    
    -- Foreign keys
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, order_number)
  ) STRICT;
`;

/**
 * Order Items Schema
 * Individual products within each order
 */
export const ORDER_ITEMS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS order_items (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL,
    
    -- Product information (denormalized for historical accuracy)
    product_id TEXT NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    
    -- Pricing at time of order
    unit_price REAL NOT NULL,
    box_size INTEGER NOT NULL, -- units per box at time of order
    
    -- Quantity ordered
    quantity_boxes INTEGER NOT NULL DEFAULT 0,
    quantity_loose INTEGER NOT NULL DEFAULT 0,
    total_units INTEGER NOT NULL DEFAULT 0, -- calculated: (quantity_boxes * box_size) + quantity_loose
    
    -- Pricing calculations
    unit_total REAL NOT NULL, -- unit_price * total_units
    discount_percentage REAL NOT NULL DEFAULT 0.00,
    discount_amount REAL NOT NULL DEFAULT 0.00,
    tax_rate REAL NOT NULL DEFAULT 0.00,
    tax_amount REAL NOT NULL DEFAULT 0.00,
    item_total REAL NOT NULL, -- final amount for this item
    
    -- Fulfillment tracking
    fulfilled_boxes INTEGER NOT NULL DEFAULT 0,
    fulfilled_loose INTEGER NOT NULL DEFAULT 0,
    fulfilled_units INTEGER NOT NULL DEFAULT 0, -- calculated: (fulfilled_boxes * box_size) + fulfilled_loose
    
    -- Item status
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- Constraints
    CONSTRAINT order_items_status_valid CHECK (status IN ('pending', 'confirmed', 'picking', 'picked', 'shipped', 'delivered', 'cancelled', 'returned')),
    CONSTRAINT order_items_product_code_not_empty CHECK (LENGTH(TRIM(product_code)) > 0),
    CONSTRAINT order_items_product_name_not_empty CHECK (LENGTH(TRIM(product_name)) > 0),
    CONSTRAINT order_items_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT order_items_box_size_positive CHECK (box_size > 0),
    CONSTRAINT order_items_quantity_boxes_positive CHECK (quantity_boxes >= 0),
    CONSTRAINT order_items_quantity_loose_positive CHECK (quantity_loose >= 0),
    CONSTRAINT order_items_has_quantity CHECK (quantity_boxes > 0 OR quantity_loose > 0),
    CONSTRAINT order_items_fulfilled_boxes_valid CHECK (fulfilled_boxes >= 0 AND fulfilled_boxes <= quantity_boxes),
    CONSTRAINT order_items_fulfilled_loose_valid CHECK (fulfilled_loose >= 0 AND fulfilled_loose <= quantity_loose),
    CONSTRAINT order_items_unit_total_positive CHECK (unit_total >= 0),
    CONSTRAINT order_items_discount_percentage_valid CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CONSTRAINT order_items_discount_amount_positive CHECK (discount_amount >= 0),
    CONSTRAINT order_items_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT order_items_tax_amount_positive CHECK (tax_amount >= 0),
    CONSTRAINT order_items_item_total_positive CHECK (item_total >= 0),
    
    -- Foreign keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  ) STRICT;
`;

/**
 * Order Item Lot Allocations Schema
 * Phase 2: Order Processing - Step 2.3 Complete Lot/Batch Integration
 * Tracks lot/batch allocations for order items to enable full inventory traceability
 */
export const ORDER_ITEM_LOT_ALLOCATIONS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS order_item_lot_allocations (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL,
    order_item_id TEXT NOT NULL,
    
    -- Lot/batch reference
    lot_batch_id TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    batch_number TEXT,
    
    -- Allocation details
    allocated_quantity INTEGER NOT NULL,
    
    -- Lot/batch tracking information
    manufacturing_date INTEGER NOT NULL, -- Unix timestamp
    expiry_date INTEGER, -- Unix timestamp, can be null for non-perishable items
    
    -- Reservation tracking
    reserved_at INTEGER NOT NULL, -- Unix timestamp
    reserved_by TEXT NOT NULL,
    
    -- Audit information
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER,
    
    -- Business rule constraints
    CONSTRAINT order_lot_allocations_allocated_quantity_positive CHECK (allocated_quantity > 0),
    CONSTRAINT order_lot_allocations_lot_number_not_empty CHECK (LENGTH(TRIM(lot_number)) > 0),
    CONSTRAINT order_lot_allocations_lot_number_length CHECK (LENGTH(lot_number) <= 50),
    CONSTRAINT order_lot_allocations_batch_number_length CHECK (batch_number IS NULL OR LENGTH(batch_number) <= 50),
    CONSTRAINT order_lot_allocations_expiry_after_manufacturing CHECK (expiry_date IS NULL OR expiry_date > manufacturing_date),
    
    -- Foreign key constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_batch_id) REFERENCES lot_batches(id) ON DELETE RESTRICT, -- Prevent deletion of lots with allocations
    FOREIGN KEY (reserved_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Lot/Batch Management Schema
 * Comprehensive lot and batch tracking for products with expiry management
 */
export const LOT_BATCHES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS lot_batches (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    lot_number TEXT NOT NULL,
    batch_number TEXT,
    
    -- Product and agency association
    product_id TEXT NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Manufacturing and expiry dates
    manufacturing_date INTEGER NOT NULL,
    expiry_date INTEGER,
    
    -- Quantity management
    quantity INTEGER NOT NULL DEFAULT 0,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (remaining_quantity - reserved_quantity) STORED,
    
    -- Lot status and tracking
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    
    -- Supplier information
    supplier_id TEXT,
    supplier_lot_code TEXT,
    
    -- Additional information
    notes TEXT,
    
    -- Audit information
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_by TEXT,
    updated_at INTEGER,
    
    -- Business rule constraints
    CONSTRAINT lot_batches_lot_number_not_empty CHECK (LENGTH(TRIM(lot_number)) > 0),
    CONSTRAINT lot_batches_lot_number_length CHECK (LENGTH(lot_number) <= 50),
    CONSTRAINT lot_batches_lot_number_format CHECK (lot_number GLOB '[A-Za-z0-9_/-]*'),
    CONSTRAINT lot_batches_batch_number_length CHECK (batch_number IS NULL OR LENGTH(batch_number) <= 50),
    CONSTRAINT lot_batches_batch_number_format CHECK (batch_number IS NULL OR batch_number GLOB '[A-Za-z0-9_/-]*'),
    -- Note: Manufacturing date validation handled at application level due to SQLite non-deterministic function restrictions
    CONSTRAINT lot_batches_expiry_after_manufacturing CHECK (expiry_date IS NULL OR expiry_date > manufacturing_date),
    CONSTRAINT lot_batches_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT lot_batches_remaining_positive CHECK (remaining_quantity >= 0),
    CONSTRAINT lot_batches_reserved_positive CHECK (reserved_quantity >= 0),
    CONSTRAINT lot_batches_remaining_valid CHECK (remaining_quantity <= quantity),
    CONSTRAINT lot_batches_reserved_valid CHECK (reserved_quantity <= remaining_quantity),
    CONSTRAINT lot_batches_status_valid CHECK (status IN ('ACTIVE', 'QUARANTINE', 'EXPIRED', 'RECALLED', 'DAMAGED', 'RESERVED', 'CONSUMED')),
    CONSTRAINT lot_batches_supplier_lot_length CHECK (supplier_lot_code IS NULL OR LENGTH(supplier_lot_code) <= 100),
    
    -- Foreign key constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints
    UNIQUE(agency_id, product_id, lot_number),
    UNIQUE(agency_id, product_id, lot_number, batch_number)
  ) STRICT;
`;

/**
 * Lot/Batch Movement History Schema
 * Tracks all movements and changes to lot/batch quantities for audit trail
 */
export const LOT_BATCH_MOVEMENTS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS lot_batch_movements (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    lot_batch_id TEXT NOT NULL,
    
    -- Movement details
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_id TEXT,
    reference_type TEXT,
    
    -- Balances after movement
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reserved_before INTEGER NOT NULL,
    reserved_after INTEGER NOT NULL,
    
    -- Movement metadata
    reason TEXT,
    notes TEXT,
    
    -- Audit information
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- Business rule constraints
    CONSTRAINT lot_movements_type_valid CHECK (movement_type IN ('RECEIVE', 'RESERVE', 'RELEASE', 'CONSUME', 'ADJUST', 'EXPIRE', 'DAMAGE')),
    CONSTRAINT lot_movements_quantity_not_zero CHECK (quantity != 0),
    CONSTRAINT lot_movements_reference_type_valid CHECK (reference_type IS NULL OR reference_type IN ('ORDER', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY')),
    CONSTRAINT lot_movements_balances_valid CHECK (quantity_before >= 0 AND quantity_after >= 0),
    CONSTRAINT lot_movements_reserved_valid CHECK (reserved_before >= 0 AND reserved_after >= 0),
    
    -- Foreign key constraints
    FOREIGN KEY (lot_batch_id) REFERENCES lot_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Export all business schemas for use in migrations
 */
export const BUSINESS_SCHEMAS = [
  AGENCIES_TABLE_SCHEMA,
  AREAS_TABLE_SCHEMA,
  WORKERS_TABLE_SCHEMA,
  CUSTOMERS_TABLE_SCHEMA,
  PRODUCTS_TABLE_SCHEMA,
  INVENTORY_TABLE_SCHEMA,
  LOT_BATCHES_TABLE_SCHEMA,
  LOT_BATCH_MOVEMENTS_TABLE_SCHEMA,
  ORDERS_TABLE_SCHEMA,
  ORDER_ITEMS_TABLE_SCHEMA,
  ORDER_ITEM_LOT_ALLOCATIONS_TABLE_SCHEMA,
  ...SHIPPING_SCHEMAS,
];

/**
 * Performance optimized indexes for business entities
 * Designed based on expected query patterns for ERP operations
 */
export const BUSINESS_INDEXES = [
  // AGENCIES - Core lookup patterns
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);`,
  `CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);`,
  `CREATE INDEX IF NOT EXISTS idx_agencies_created_at ON agencies(created_at);`,

  // AREAS - Geographic and agency-based queries
  `CREATE INDEX IF NOT EXISTS idx_areas_agency_id ON areas(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_agency_code ON areas(agency_id, area_code);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_agency_name ON areas(agency_id, area_name);`,
  `CREATE INDEX IF NOT EXISTS idx_areas_status ON areas(status);`,
  `CREATE INDEX IF NOT EXISTS idx_areas_location ON areas(latitude, longitude);`,

  // WORKERS - Assignment and authentication queries
  `CREATE INDEX IF NOT EXISTS idx_workers_agency_id ON workers(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_agency_code ON workers(agency_id, worker_code);`,
  `CREATE INDEX IF NOT EXISTS idx_workers_area_id ON workers(assigned_area_id);`,
  `CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);`,
  `CREATE INDEX IF NOT EXISTS idx_workers_employment ON workers(employment_type);`,
  `CREATE INDEX IF NOT EXISTS idx_workers_mobile_auth ON workers(mobile_pin_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_workers_performance ON workers(target_orders_per_day, commission_rate);`,

  // CUSTOMERS - CRM and order processing queries
  `CREATE INDEX IF NOT EXISTS idx_customers_agency_id ON customers(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_agency_code ON customers(agency_id, customer_code);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_area_worker ON customers(area_id, assigned_worker_id);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_priority ON customers(priority_level);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_credit ON customers(credit_limit, current_balance);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_business_metrics ON customers(total_orders, total_revenue);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_last_order ON customers(last_order_date);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_contact ON customers(phone, email);`,

  // PRODUCTS - Catalog and pricing queries
  `CREATE INDEX IF NOT EXISTS idx_products_agency_id ON products(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_agency_code ON products(agency_id, product_code);`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`,
  `CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);`,
  `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`,
  `CREATE INDEX IF NOT EXISTS idx_products_pricing ON products(unit_price, wholesale_price, retail_price);`,
  `CREATE INDEX IF NOT EXISTS idx_products_packaging ON products(box_size, unit_of_measure);`,
  `CREATE INDEX IF NOT EXISTS idx_products_business_rules ON products(allow_loose_packing, requires_refrigeration, is_taxable);`,
  `CREATE INDEX IF NOT EXISTS idx_products_search ON products(product_name, description, category, brand);`,

  // INVENTORY - Stock level and threshold queries
  `CREATE INDEX IF NOT EXISTS idx_inventory_agency_id ON inventory(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_agency_product ON inventory(agency_id, product_id);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON inventory(available_boxes, available_loose);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_reserved_stock ON inventory(reserved_boxes, reserved_loose);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_thresholds ON inventory(minimum_stock_level, reorder_point, maximum_stock_level);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(agency_id, available_boxes, available_loose, minimum_stock_level);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_last_movement ON inventory(last_movement_at, last_movement_type);`,

  // ORDERS - Main order processing queries (most critical for performance)
  `CREATE INDEX IF NOT EXISTS idx_orders_agency_id ON orders(agency_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_agency_number ON orders(agency_id, order_number);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_worker_area ON orders(worker_id, area_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_date_range ON orders(order_date, delivery_date);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_financial ON orders(total_amount, payment_method);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(sync_session_id, mobile_device_id, created_offline);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(agency_id, status, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer_recent ON orders(customer_id, order_date);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_worker_performance ON orders(worker_id, order_date, total_amount);`,

  // ORDER_ITEMS - Product sales and fulfillment tracking
  `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_quantities ON order_items(quantity_boxes, quantity_loose);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment ON order_items(fulfilled_boxes, fulfilled_loose);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_pricing ON order_items(unit_price, item_total);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_product_sales ON order_items(product_id, created_at, item_total);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_pending_fulfillment ON order_items(status, order_id, fulfilled_boxes, fulfilled_loose, quantity_boxes, quantity_loose);`,

  // LOT_BATCHES - Lot/batch tracking and expiry management
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_agency_id ON lot_batches(agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_product_id ON lot_batches(product_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_batches_agency_product_lot ON lot_batches(agency_id, product_id, lot_number);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_batches_agency_product_lot_batch ON lot_batches(agency_id, product_id, lot_number, batch_number);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_status ON lot_batches(status);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_expiry_date ON lot_batches(expiry_date);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_manufacturing_date ON lot_batches(manufacturing_date);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_quantities ON lot_batches(remaining_quantity, reserved_quantity, available_quantity);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_available_stock ON lot_batches(agency_id, product_id, status, available_quantity);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_expiring_soon ON lot_batches(agency_id, product_id, expiry_date, status);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_expired ON lot_batches(status, expiry_date);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_supplier ON lot_batches(supplier_id, supplier_lot_code);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_fifo ON lot_batches(product_id, manufacturing_date, status, available_quantity);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_batches_audit ON lot_batches(created_by, created_at, updated_by, updated_at);`,

  // LOT_BATCH_MOVEMENTS - Movement tracking and audit trail
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_lot_batch_id ON lot_batch_movements(lot_batch_id);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_type ON lot_batch_movements(movement_type);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_created_at ON lot_batch_movements(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_reference ON lot_batch_movements(reference_id, reference_type);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_audit_trail ON lot_batch_movements(lot_batch_id, created_at, movement_type);`,
  `CREATE INDEX IF NOT EXISTS idx_lot_movements_created_by ON lot_batch_movements(created_by, created_at);`,

  // ORDER_ITEM_LOT_ALLOCATIONS - Phase 2: Order lot allocation tracking
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_id ON order_item_lot_allocations(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_item_id ON order_item_lot_allocations(order_item_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_batch_id ON order_item_lot_allocations(lot_batch_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_number ON order_item_lot_allocations(lot_number);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_reserved_at ON order_item_lot_allocations(reserved_at);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_reserved_by ON order_item_lot_allocations(reserved_by);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_manufacturing_date ON order_item_lot_allocations(manufacturing_date);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_expiry_date ON order_item_lot_allocations(expiry_date);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_tracking ON order_item_lot_allocations(order_id, order_item_id, lot_batch_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_tracking ON order_item_lot_allocations(lot_batch_id, reserved_at, allocated_quantity);`,
  `CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_expiring_lots ON order_item_lot_allocations(expiry_date, order_id, lot_number);`,
];

/**
 * Business entity audit triggers for comprehensive change tracking
 */
export const BUSINESS_AUDIT_TRIGGERS = [
  // AGENCIES audit triggers
  `CREATE TRIGGER IF NOT EXISTS audit_agencies_insert
   AFTER INSERT ON agencies
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'agencies', NEW.id, 'INSERT',
       json_object('id', NEW.id, 'name', NEW.name, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_agencies_update
   AFTER UPDATE ON agencies
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'agencies', NEW.id, 'UPDATE',
       json_object('name', OLD.name, 'status', OLD.status),
       json_object('name', NEW.name, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  // CUSTOMERS audit triggers (high-value entity)
  `CREATE TRIGGER IF NOT EXISTS audit_customers_insert
   AFTER INSERT ON customers
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'customers', NEW.id, 'INSERT',
       json_object('customer_code', NEW.customer_code, 'customer_name', NEW.customer_name, 
                   'credit_limit', NEW.credit_limit, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_customers_update
   AFTER UPDATE ON customers
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'customers', NEW.id, 'UPDATE',
       json_object('credit_limit', OLD.credit_limit, 'current_balance', OLD.current_balance, 'status', OLD.status),
       json_object('credit_limit', NEW.credit_limit, 'current_balance', NEW.current_balance, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  // INVENTORY audit triggers (critical for stock management)
  `CREATE TRIGGER IF NOT EXISTS audit_inventory_update
   AFTER UPDATE ON inventory
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'inventory', NEW.id, 'UPDATE',
       json_object('available_boxes', OLD.available_boxes, 'available_loose', OLD.available_loose,
                   'reserved_boxes', OLD.reserved_boxes, 'reserved_loose', OLD.reserved_loose),
       json_object('available_boxes', NEW.available_boxes, 'available_loose', NEW.available_loose,
                   'reserved_boxes', NEW.reserved_boxes, 'reserved_loose', NEW.reserved_loose),
       unixepoch()
     );
   END;`,

  // ORDERS audit triggers (business-critical transactions)
  `CREATE TRIGGER IF NOT EXISTS audit_orders_insert
   AFTER INSERT ON orders
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'orders', NEW.id, 'INSERT',
       json_object('order_number', NEW.order_number, 'customer_id', NEW.customer_id, 
                   'total_amount', NEW.total_amount, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_orders_status_update
   AFTER UPDATE OF status, fulfillment_status, payment_status ON orders
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'orders', NEW.id, 'UPDATE',
       json_object('status', OLD.status, 'fulfillment_status', OLD.fulfillment_status, 'payment_status', OLD.payment_status),
       json_object('status', NEW.status, 'fulfillment_status', NEW.fulfillment_status, 'payment_status', NEW.payment_status),
       NEW.created_by, unixepoch()
     );
   END;`,

  // LOT_BATCHES audit triggers (critical for lot/batch tracking)
  `CREATE TRIGGER IF NOT EXISTS audit_lot_batches_insert
   AFTER INSERT ON lot_batches
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'lot_batches', NEW.id, 'INSERT',
       json_object('lot_number', NEW.lot_number, 'batch_number', NEW.batch_number, 
                   'product_id', NEW.product_id, 'quantity', NEW.quantity, 'status', NEW.status),
       NEW.created_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_lot_batches_quantity_update
   AFTER UPDATE OF remaining_quantity, reserved_quantity, status ON lot_batches
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'lot_batches', NEW.id, 'UPDATE',
       json_object('remaining_quantity', OLD.remaining_quantity, 'reserved_quantity', OLD.reserved_quantity, 'status', OLD.status),
       json_object('remaining_quantity', NEW.remaining_quantity, 'reserved_quantity', NEW.reserved_quantity, 'status', NEW.status),
       NEW.updated_by, unixepoch()
     );
   END;`,

  // LOT_BATCH_MOVEMENTS audit triggers (movement tracking)
  `CREATE TRIGGER IF NOT EXISTS audit_lot_movements_insert
   AFTER INSERT ON lot_batch_movements
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'lot_batch_movements', NEW.id, 'INSERT',
       json_object('lot_batch_id', NEW.lot_batch_id, 'movement_type', NEW.movement_type, 
                   'quantity', NEW.quantity, 'reference_id', NEW.reference_id),
       NEW.created_by, unixepoch()
     );
   END;`,

  // ORDER_ITEM_LOT_ALLOCATIONS audit triggers (Phase 2: Critical for lot allocation tracking)
  `CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_insert
   AFTER INSERT ON order_item_lot_allocations
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'order_item_lot_allocations', NEW.id, 'INSERT',
       json_object('order_id', NEW.order_id, 'order_item_id', NEW.order_item_id, 
                   'lot_batch_id', NEW.lot_batch_id, 'lot_number', NEW.lot_number, 
                   'allocated_quantity', NEW.allocated_quantity),
       NEW.reserved_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_update
   AFTER UPDATE OF allocated_quantity ON order_item_lot_allocations
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'order_item_lot_allocations', NEW.id, 'UPDATE',
       json_object('allocated_quantity', OLD.allocated_quantity),
       json_object('allocated_quantity', NEW.allocated_quantity),
       NEW.reserved_by, unixepoch()
     );
   END;`,

  `CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_delete
   BEFORE DELETE ON order_item_lot_allocations
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))), 'order_item_lot_allocations', OLD.id, 'DELETE',
       json_object('order_id', OLD.order_id, 'order_item_id', OLD.order_item_id, 
                   'lot_batch_id', OLD.lot_batch_id, 'lot_number', OLD.lot_number, 
                   'allocated_quantity', OLD.allocated_quantity),
       OLD.reserved_by, unixepoch()
     );
   END;`,
];

/**
 * Performance optimization queries for business entities
 */
export const BUSINESS_PERFORMANCE_OPTIMIZATIONS = [
  // Analyze business tables for query optimizer
  `ANALYZE agencies;`,
  `ANALYZE areas;`,
  `ANALYZE workers;`,
  `ANALYZE customers;`,
  `ANALYZE products;`,
  `ANALYZE inventory;`,
  `ANALYZE lot_batches;`,
  `ANALYZE lot_batch_movements;`,
  `ANALYZE orders;`,
  `ANALYZE order_items;`,
  `ANALYZE order_item_lot_allocations;`,

  // Update table statistics for better query planning
  `UPDATE sqlite_stat1 SET stat = NULL;`,
  `ANALYZE;`,
];

/**
 * Business validation queries for data integrity
 */
export const BUSINESS_VALIDATION_QUERIES = [
  // Check foreign key relationships
  `SELECT 'areas_agency_fk' as check_name, COUNT(*) as violations 
   FROM areas a LEFT JOIN agencies ag ON a.agency_id = ag.id 
   WHERE ag.id IS NULL;`,

  `SELECT 'customers_area_fk' as check_name, COUNT(*) as violations 
   FROM customers c LEFT JOIN areas a ON c.area_id = a.id 
   WHERE c.area_id IS NOT NULL AND a.id IS NULL;`,

  `SELECT 'inventory_product_fk' as check_name, COUNT(*) as violations 
   FROM inventory i LEFT JOIN products p ON i.product_id = p.id 
   WHERE p.id IS NULL;`,

  `SELECT 'orders_customer_fk' as check_name, COUNT(*) as violations 
   FROM orders o LEFT JOIN customers c ON o.customer_id = c.id 
   WHERE c.id IS NULL;`,

  // Check business rule constraints
  `SELECT 'negative_inventory' as check_name, COUNT(*) as violations 
   FROM inventory 
   WHERE available_boxes < 0 OR available_loose < 0;`,

  `SELECT 'orders_without_items' as check_name, COUNT(*) as violations 
   FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id 
   WHERE oi.order_id IS NULL;`,

  `SELECT 'credit_limit_violations' as check_name, COUNT(*) as violations 
   FROM customers 
   WHERE current_balance > credit_limit AND credit_limit > 0;`,

  // Lot/batch validation checks
  `SELECT 'lot_batches_product_fk' as check_name, COUNT(*) as violations 
   FROM lot_batches lb LEFT JOIN products p ON lb.product_id = p.id 
   WHERE p.id IS NULL;`,

  `SELECT 'lot_batches_agency_fk' as check_name, COUNT(*) as violations 
   FROM lot_batches lb LEFT JOIN agencies a ON lb.agency_id = a.id 
   WHERE a.id IS NULL;`,

  `SELECT 'lot_batch_movements_fk' as check_name, COUNT(*) as violations 
   FROM lot_batch_movements lbm LEFT JOIN lot_batches lb ON lbm.lot_batch_id = lb.id 
   WHERE lb.id IS NULL;`,

  `SELECT 'negative_lot_quantities' as check_name, COUNT(*) as violations 
   FROM lot_batches 
   WHERE remaining_quantity < 0 OR reserved_quantity < 0;`,

  `SELECT 'invalid_lot_reserved_quantities' as check_name, COUNT(*) as violations 
   FROM lot_batches 
   WHERE reserved_quantity > remaining_quantity;`,

  `SELECT 'expired_active_lots' as check_name, COUNT(*) as violations 
   FROM lot_batches 
   WHERE status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date < unixepoch();`,

  // ORDER_ITEM_LOT_ALLOCATIONS validation checks (Phase 2: Lot allocation integrity)
  `SELECT 'order_lot_allocations_order_fk' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations ola LEFT JOIN orders o ON ola.order_id = o.id 
   WHERE o.id IS NULL;`,

  `SELECT 'order_lot_allocations_order_item_fk' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations ola LEFT JOIN order_items oi ON ola.order_item_id = oi.id 
   WHERE oi.id IS NULL;`,

  `SELECT 'order_lot_allocations_lot_batch_fk' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations ola LEFT JOIN lot_batches lb ON ola.lot_batch_id = lb.id 
   WHERE lb.id IS NULL;`,

  `SELECT 'negative_allocated_quantities' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations 
   WHERE allocated_quantity <= 0;`,

  `SELECT 'mismatched_lot_information' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations ola 
   JOIN lot_batches lb ON ola.lot_batch_id = lb.id 
   WHERE ola.lot_number != lb.lot_number 
      OR (ola.batch_number IS NOT NULL AND ola.batch_number != lb.batch_number)
      OR (ola.batch_number IS NULL AND lb.batch_number IS NOT NULL);`,

  `SELECT 'allocation_expiry_mismatch' as check_name, COUNT(*) as violations 
   FROM order_item_lot_allocations ola 
   JOIN lot_batches lb ON ola.lot_batch_id = lb.id 
   WHERE (ola.expiry_date IS NULL AND lb.expiry_date IS NOT NULL)
      OR (ola.expiry_date IS NOT NULL AND lb.expiry_date IS NULL)
      OR (ola.expiry_date IS NOT NULL AND lb.expiry_date IS NOT NULL AND ola.expiry_date != lb.expiry_date);`,
];
