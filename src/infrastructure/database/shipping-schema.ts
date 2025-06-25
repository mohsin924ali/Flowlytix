/**
 * Shipping Database Schema Definitions - Step 3C.1
 *
 * Database schema for shipping operations tables following enterprise-grade
 * normalization principles and optimal indexing strategy for shipping management.
 *
 * Features:
 * - Comprehensive shipping transaction tracking
 * - Carrier integration support
 * - Delivery tracking and audit trail
 * - Performance-optimized indexing
 * - Multi-tenant agency isolation
 * - Status management and reporting
 *
 * @domain Order Management - Shipping Operations
 * @version 1.0.0 - Step 3C: Infrastructure Layer
 */

/**
 * Main shipping table schema
 * Handles all shipping operations with comprehensive tracking
 */
export const SHIPPING_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS shipping (
    -- Primary key with UUID for distributed systems
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Order relationship (required for shipping context)
    order_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    
    -- Customer information (denormalized for performance)
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    
    -- Tracking information
    tracking_number TEXT NULL UNIQUE,
    
    -- Carrier and service details
    carrier TEXT NOT NULL,
    service_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    
    -- Shipping status
    status TEXT NOT NULL DEFAULT 'PENDING',
    
    -- Addresses (stored as JSON for flexibility)
    shipping_address TEXT NOT NULL, -- JSON string
    return_address TEXT NOT NULL, -- JSON string
    
    -- Package dimensions
    package_length REAL NOT NULL,
    package_width REAL NOT NULL,
    package_height REAL NOT NULL,
    package_weight REAL NOT NULL,
    volumetric_weight REAL NULL,
    
    -- Financial information (stored in cents for precision)
    declared_value INTEGER NOT NULL, -- Amount in cents
    declared_value_currency TEXT NOT NULL DEFAULT 'USD',
    shipping_cost INTEGER NOT NULL, -- Amount in cents
    shipping_cost_currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Optional fields
    label_url TEXT NULL,
    estimated_delivery_date INTEGER NULL, -- Unix timestamp
    actual_delivery_date INTEGER NULL, -- Unix timestamp
    requires_signature INTEGER NOT NULL DEFAULT 0, -- boolean
    is_insured INTEGER NOT NULL DEFAULT 0, -- boolean
    insurance_value INTEGER NULL, -- Amount in cents
    insurance_value_currency TEXT NULL,
    special_instructions TEXT NULL,
    
    -- Tracking and delivery data (stored as JSON for flexibility)
    delivery_attempts TEXT NULL, -- JSON array
    tracking_events TEXT NULL, -- JSON array
    audit_trail TEXT NULL, -- JSON array
    
    -- Multi-tenant isolation
    agency_id TEXT NOT NULL,
    
    -- Audit fields
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_by TEXT NULL,
    updated_at INTEGER NULL, -- Unix timestamp
    picked_up_at INTEGER NULL, -- Unix timestamp
    delivered_at INTEGER NULL, -- Unix timestamp
    
    -- Constraints
    CONSTRAINT shipping_declared_value_positive CHECK (declared_value > 0),
    CONSTRAINT shipping_shipping_cost_positive CHECK (shipping_cost >= 0),
    CONSTRAINT shipping_insurance_value_positive CHECK (insurance_value IS NULL OR insurance_value > 0),
    CONSTRAINT shipping_currency_valid CHECK (
      LENGTH(declared_value_currency) = 3 AND
      LENGTH(shipping_cost_currency) = 3 AND
      (insurance_value_currency IS NULL OR LENGTH(insurance_value_currency) = 3)
    ),
    CONSTRAINT shipping_carrier_valid CHECK (
      carrier IN ('UPS', 'FEDEX', 'DHL', 'USPS', 'LOCAL_COURIER', 'SELF_DELIVERY', 'THIRD_PARTY')
    ),
    CONSTRAINT shipping_service_type_valid CHECK (
      service_type IN ('STANDARD', 'EXPRESS', 'OVERNIGHT', 'SAME_DAY', 'TWO_DAY', 'GROUND', 'INTERNATIONAL')
    ),
    CONSTRAINT shipping_priority_valid CHECK (
      priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')
    ),
    CONSTRAINT shipping_status_valid CHECK (
      status IN ('PENDING', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ATTEMPTED_DELIVERY', 'FAILED', 'RETURNED', 'CANCELLED', 'LOST')
    ),
    CONSTRAINT shipping_package_dimensions_positive CHECK (
      package_length > 0 AND package_width > 0 AND package_height > 0 AND package_weight > 0
    ),
    CONSTRAINT shipping_volumetric_weight_positive CHECK (volumetric_weight IS NULL OR volumetric_weight > 0),
    CONSTRAINT shipping_boolean_signature CHECK (requires_signature IN (0, 1)),
    CONSTRAINT shipping_boolean_insured CHECK (is_insured IN (0, 1)),
    CONSTRAINT shipping_dates_logical CHECK (
      (updated_at IS NULL OR updated_at >= created_at) AND
      (picked_up_at IS NULL OR picked_up_at >= created_at) AND
      (delivered_at IS NULL OR delivered_at >= created_at) AND
      (actual_delivery_date IS NULL OR delivered_at IS NOT NULL OR status = 'DELIVERED')
    ),
    CONSTRAINT shipping_tracking_number_not_empty CHECK (
      tracking_number IS NULL OR LENGTH(TRIM(tracking_number)) > 0
    ),
    CONSTRAINT shipping_insurance_consistency CHECK (
      (is_insured = 0 AND insurance_value IS NULL AND insurance_value_currency IS NULL) OR
      (is_insured = 1 AND insurance_value IS NOT NULL AND insurance_value_currency IS NOT NULL)
    ),
    
    -- Foreign key constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Shipping table indexes for optimal query performance
 * Designed based on expected query patterns in shipping operations
 */
export const SHIPPING_TABLE_INDEXES = [
  // Primary tracking number lookup (most common operation)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_tracking_number ON shipping(tracking_number) WHERE tracking_number IS NOT NULL;`,

  // Order relationship queries
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_order_id ON shipping(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_order_number ON shipping(order_number);`,

  // Customer-based queries
  `CREATE INDEX IF NOT EXISTS idx_shipping_customer_id ON shipping(customer_id);`,

  // Status-based queries for operational dashboards
  `CREATE INDEX IF NOT EXISTS idx_shipping_status ON shipping(status);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_status_agency ON shipping(status, agency_id);`,

  // Carrier and service type filtering
  `CREATE INDEX IF NOT EXISTS idx_shipping_carrier ON shipping(carrier);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_service_type ON shipping(service_type);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_priority ON shipping(priority);`,

  // Date-based queries for reporting and analytics
  `CREATE INDEX IF NOT EXISTS idx_shipping_created_at ON shipping(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_estimated_delivery ON shipping(estimated_delivery_date) WHERE estimated_delivery_date IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_actual_delivery ON shipping(actual_delivery_date) WHERE actual_delivery_date IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_picked_up_at ON shipping(picked_up_at) WHERE picked_up_at IS NOT NULL;`,

  // Multi-tenant isolation
  `CREATE INDEX IF NOT EXISTS idx_shipping_agency_id ON shipping(agency_id);`,

  // Composite indexes for common query patterns
  `CREATE INDEX IF NOT EXISTS idx_shipping_agency_status_created ON shipping(agency_id, status, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_carrier_status ON shipping(carrier, status);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_customer_status ON shipping(customer_id, status);`,

  // Operational queries
  `CREATE INDEX IF NOT EXISTS idx_shipping_pending_pickup ON shipping(status, created_at) WHERE status = 'LABEL_CREATED';`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_in_transit ON shipping(status, carrier, created_at) WHERE status IN ('PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY');`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_overdue ON shipping(estimated_delivery_date, status) WHERE status NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED') AND estimated_delivery_date IS NOT NULL;`,

  // Delivery tracking indexes
  `CREATE INDEX IF NOT EXISTS idx_shipping_requires_signature ON shipping(requires_signature, status) WHERE requires_signature = 1;`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_insured ON shipping(is_insured, status) WHERE is_insured = 1;`,

  // Audit and compliance indexes
  `CREATE INDEX IF NOT EXISTS idx_shipping_created_by ON shipping(created_by);`,
  `CREATE INDEX IF NOT EXISTS idx_shipping_updated_by ON shipping(updated_by) WHERE updated_by IS NOT NULL;`,

  // Performance index for date range queries
  `CREATE INDEX IF NOT EXISTS idx_shipping_date_range ON shipping(agency_id, created_at, status);`,

  // Search index for tracking and order numbers
  `CREATE INDEX IF NOT EXISTS idx_shipping_search_numbers ON shipping(order_number, tracking_number);`,
];

/**
 * Shipping statistics view for reporting
 * Pre-computed statistics for dashboard performance
 */
export const SHIPPING_STATISTICS_VIEW = `
  CREATE VIEW IF NOT EXISTS shipping_statistics AS
  SELECT 
    agency_id,
    DATE(created_at, 'unixepoch') as shipping_date,
    carrier,
    status,
    COUNT(*) as shipment_count,
    SUM(shipping_cost) / 100.0 as total_shipping_cost,
    AVG(shipping_cost) / 100.0 as average_shipping_cost,
    SUM(declared_value) / 100.0 as total_declared_value,
    COUNT(CASE WHEN tracking_number IS NOT NULL THEN 1 END) as tracked_shipments,
    COUNT(CASE WHEN requires_signature = 1 THEN 1 END) as signature_required,
    COUNT(CASE WHEN is_insured = 1 THEN 1 END) as insured_shipments,
    COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN status IN ('FAILED', 'RETURNED') THEN 1 END) as failed_count
  FROM shipping
  GROUP BY agency_id, DATE(created_at, 'unixepoch'), carrier, status;
`;

/**
 * Shipping performance view for carrier analytics
 * Performance metrics by carrier for operational insights
 */
export const SHIPPING_PERFORMANCE_VIEW = `
  CREATE VIEW IF NOT EXISTS shipping_performance AS
  SELECT 
    agency_id,
    carrier,
    service_type,
    COUNT(*) as total_shipments,
    COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_shipments,
    COUNT(CASE WHEN status IN ('FAILED', 'RETURNED') THEN 1 END) as failed_shipments,
    ROUND(
      CAST(COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) AS FLOAT) / 
      CAST(COUNT(*) AS FLOAT) * 100, 2
    ) as delivery_success_rate,
    AVG(
      CASE 
        WHEN delivered_at IS NOT NULL AND picked_up_at IS NOT NULL 
        THEN ROUND((delivered_at - picked_up_at) / 3600.0, 1)
        ELSE NULL 
      END
    ) as average_delivery_time_hours,
    SUM(shipping_cost) / 100.0 as total_shipping_cost,
    AVG(shipping_cost) / 100.0 as average_shipping_cost
  FROM shipping
  WHERE status NOT IN ('PENDING', 'CANCELLED')
  GROUP BY agency_id, carrier, service_type;
`;

/**
 * Complete shipping schema creation order
 */
export const SHIPPING_SCHEMAS = [
  SHIPPING_TABLE_SCHEMA,
  ...SHIPPING_TABLE_INDEXES,
  SHIPPING_STATISTICS_VIEW,
  SHIPPING_PERFORMANCE_VIEW,
];

/**
 * Export individual components for modular usage
 */
