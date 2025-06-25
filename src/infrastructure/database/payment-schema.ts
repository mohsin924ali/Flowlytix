/**
 * Payment Database Schema Definitions
 *
 * Database schema for payment processing tables following enterprise-grade
 * normalization principles and optimal indexing strategy for payment operations.
 *
 * Features:
 * - Comprehensive payment transaction tracking
 * - Gateway integration support
 * - Audit trail for compliance
 * - Performance-optimized indexing
 * - Multi-tenant agency isolation
 * - Payment retry and status management
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0
 */

/**
 * Main payments table schema
 * Handles all payment transactions with comprehensive tracking
 */
export const PAYMENTS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS payments (
    -- Primary key with UUID for distributed systems
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Order relationship (required for payment context)
    order_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    
    -- Customer information (denormalized for performance)
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    
    -- Payment amount and currency
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Payment method and gateway
    payment_method TEXT NOT NULL,
    gateway TEXT NOT NULL,
    
    -- Payment status and transaction type
    status TEXT NOT NULL DEFAULT 'PENDING',
    transaction_type TEXT NOT NULL DEFAULT 'PAYMENT',
    
    -- Transaction references
    transaction_reference TEXT NOT NULL UNIQUE,
    gateway_transaction_id TEXT NULL,
    
    -- Payment metadata
    description TEXT NULL,
    metadata TEXT NULL, -- JSON string for additional data
    
    -- Retry information (JSON string)
    retry_info TEXT NULL,
    
    -- Multi-tenant isolation
    agency_id TEXT NOT NULL,
    
    -- Audit fields
    initiated_by TEXT NOT NULL,
    initiated_at INTEGER NOT NULL, -- Unix timestamp
    processed_at INTEGER NULL, -- Unix timestamp
    completed_at INTEGER NULL, -- Unix timestamp
    updated_by TEXT NULL,
    updated_at INTEGER NULL, -- Unix timestamp
    
    -- Constraints
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_currency_valid CHECK (LENGTH(currency) = 3),
    CONSTRAINT payments_payment_method_valid CHECK (
      payment_method IN ('CASH', 'CREDIT', 'CHEQUE', 'BANK_TRANSFER')
    ),
    CONSTRAINT payments_gateway_valid CHECK (
      gateway IN ('STRIPE', 'PAYPAL', 'SQUARE', 'INTERNAL_CASH', 'INTERNAL_CREDIT', 'BANK_TRANSFER')
    ),
    CONSTRAINT payments_status_valid CHECK (
      status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')
    ),
    CONSTRAINT payments_transaction_type_valid CHECK (
      transaction_type IN ('PAYMENT', 'REFUND', 'PARTIAL_REFUND', 'AUTHORIZATION', 'CAPTURE', 'VOID')
    ),
    CONSTRAINT payments_transaction_reference_not_empty CHECK (
      LENGTH(TRIM(transaction_reference)) > 0
    ),
    CONSTRAINT payments_dates_logical CHECK (
      (processed_at IS NULL OR processed_at >= initiated_at) AND
      (completed_at IS NULL OR completed_at >= initiated_at)
    ),
    
    -- Foreign key constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Payment audit trail table for tracking all payment workflow steps
 */
export const PAYMENT_AUDIT_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS payment_audit_trail (
    id TEXT PRIMARY KEY NOT NULL,
    payment_id TEXT NOT NULL,
    
    -- Audit action details
    action_type TEXT NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    
    -- Gateway response (JSON string)
    gateway_response TEXT NULL,
    
    -- Audit metadata
    notes TEXT NULL,
    metadata TEXT NULL, -- JSON string
    
    -- Audit tracking
    performed_by TEXT NOT NULL,
    performed_at INTEGER NOT NULL, -- Unix timestamp
    
    -- Constraints
    CONSTRAINT payment_audit_action_type_valid CHECK (
      action_type IN (
        'INITIATE', 'PROCESS', 'COMPLETE', 'FAIL', 'CANCEL', 
        'REFUND_CREATE', 'REFUND_PROCESS', 'RETRY', 'GATEWAY_CALLBACK'
      )
    ),
    CONSTRAINT payment_audit_status_valid CHECK (
      previous_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED') AND
      new_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')
    ),
    
    -- Foreign key constraints
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
  ) STRICT;
`;

/**
 * Payment gateway configurations table
 */
export const PAYMENT_GATEWAY_CONFIG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    
    -- Gateway identification
    gateway TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    environment TEXT NOT NULL DEFAULT 'sandbox',
    
    -- Gateway credentials (encrypted)
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    webhook_secret TEXT NULL,
    merchant_id TEXT NULL,
    
    -- Configuration settings (JSON string)
    supported_methods TEXT NOT NULL, -- JSON array
    default_currency TEXT NOT NULL DEFAULT 'USD',
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    retry_attempts INTEGER NOT NULL DEFAULT 3,
    webhook_endpoint TEXT NULL,
    
    -- Audit fields
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NULL,
    
    -- Constraints
    CONSTRAINT gateway_config_gateway_valid CHECK (
      gateway IN ('STRIPE', 'PAYPAL', 'SQUARE', 'INTERNAL_CASH', 'INTERNAL_CREDIT', 'BANK_TRANSFER')
    ),
    CONSTRAINT gateway_config_environment_valid CHECK (
      environment IN ('sandbox', 'production')
    ),
    CONSTRAINT gateway_config_enabled_boolean CHECK (enabled IN (0, 1)),
    CONSTRAINT gateway_config_timeout_positive CHECK (timeout_seconds > 0),
    CONSTRAINT gateway_config_retry_positive CHECK (retry_attempts >= 0),
    CONSTRAINT gateway_config_currency_valid CHECK (LENGTH(default_currency) = 3),
    
    -- Unique constraint per agency per gateway
    UNIQUE(agency_id, gateway),
    
    -- Foreign key constraints
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Payment performance indexes for optimal query performance
 */
export const PAYMENTS_TABLE_INDEXES = [
  // Primary lookups
  `CREATE INDEX IF NOT EXISTS idx_payments_transaction_reference ON payments(transaction_reference);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction_id ON payments(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;`,

  // Order and customer relationships
  `CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);`,

  // Agency isolation (critical for multi-tenant)
  `CREATE INDEX IF NOT EXISTS idx_payments_agency_id ON payments(agency_id);`,

  // Status and workflow queries
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON payments(transaction_type);`,

  // Gateway and method filtering
  `CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);`,

  // Date-based queries for reporting
  `CREATE INDEX IF NOT EXISTS idx_payments_initiated_at ON payments(initiated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_completed_at ON payments(completed_at) WHERE completed_at IS NOT NULL;`,

  // Composite indexes for common query patterns
  `CREATE INDEX IF NOT EXISTS idx_payments_agency_status ON payments(agency_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_agency_customer ON payments(agency_id, customer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_agency_date_range ON payments(agency_id, initiated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_gateway_status ON payments(gateway, status);`,

  // Retry and failure analysis
  `CREATE INDEX IF NOT EXISTS idx_payments_failed_retry ON payments(status, retry_info) WHERE status = 'FAILED' AND retry_info IS NOT NULL;`,

  // Performance: Order payment summary
  `CREATE INDEX IF NOT EXISTS idx_payments_order_summary ON payments(order_id, status, transaction_type, amount);`,

  // Analytics and reporting
  `CREATE INDEX IF NOT EXISTS idx_payments_analytics ON payments(agency_id, gateway, status, initiated_at, amount);`,
];

/**
 * Payment audit trail indexes
 */
export const PAYMENT_AUDIT_TABLE_INDEXES = [
  // Payment audit history
  `CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_id ON payment_audit_trail(payment_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payment_audit_performed_at ON payment_audit_trail(performed_at);`,

  // Action type filtering
  `CREATE INDEX IF NOT EXISTS idx_payment_audit_action_type ON payment_audit_trail(action_type);`,

  // Composite for audit queries
  `CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_date ON payment_audit_trail(payment_id, performed_at);`,
];

/**
 * Gateway configuration indexes
 */
export const PAYMENT_GATEWAY_CONFIG_TABLE_INDEXES = [
  // Agency gateway lookups
  `CREATE INDEX IF NOT EXISTS idx_gateway_config_agency ON payment_gateway_configs(agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_gateway_config_gateway ON payment_gateway_configs(gateway);`,

  // Enabled gateways
  `CREATE INDEX IF NOT EXISTS idx_gateway_config_enabled ON payment_gateway_configs(agency_id, enabled) WHERE enabled = 1;`,
];

/**
 * Complete payment schema creation order (respects foreign key dependencies)
 */
export const PAYMENT_SCHEMA_CREATION_ORDER = [
  // Tables first (order matters due to foreign keys)
  PAYMENTS_TABLE_SCHEMA,
  PAYMENT_AUDIT_TABLE_SCHEMA,
  PAYMENT_GATEWAY_CONFIG_TABLE_SCHEMA,

  // Indexes for performance
  ...PAYMENTS_TABLE_INDEXES,
  ...PAYMENT_AUDIT_TABLE_INDEXES,
  ...PAYMENT_GATEWAY_CONFIG_TABLE_INDEXES,
];

/**
 * Payment schema version for migration tracking
 */
export const PAYMENT_SCHEMA_VERSION = {
  version: 1,
  description: 'Initial payment processing schema',
  checksum: 'payment_schema_v1_0_0',
};
