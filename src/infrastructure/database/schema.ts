/**
 * Database Schema Definitions
 * Following enterprise-grade normalization principles for robust data handling
 * Designed for large datasets with optimal indexing strategy
 */

// Import business schemas
import { BUSINESS_SCHEMAS, BUSINESS_INDEXES } from './business-schema';

/**
 * Users table schema - Normalized for optimal performance
 * Handles large user datasets with proper indexing
 */
export const USERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    -- Primary key with UUID for distributed systems
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Core user information (normalized)
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    -- Authentication data
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2',
    password_iterations INTEGER NOT NULL DEFAULT 100000,
    password_created_at INTEGER NOT NULL, -- Unix timestamp for performance
    
    -- Role and status (denormalized for performance)
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Security tracking
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NULL, -- Unix timestamp, NULL if not locked
    last_login_at INTEGER NULL, -- Unix timestamp, NULL if never logged in
    
    -- Audit fields
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_at INTEGER NOT NULL, -- Unix timestamp
    created_by TEXT NULL, -- Foreign key to users.id
    updated_by TEXT NULL, -- Foreign key to users.id
    
    -- Version control for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email LIKE '%@%'),
    CONSTRAINT users_role_valid CHECK (role IN ('super_admin', 'admin', 'manager', 'employee', 'viewer')),
    CONSTRAINT users_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT users_login_attempts_positive CHECK (login_attempts >= 0),
    CONSTRAINT users_password_iterations_min CHECK (password_iterations >= 10000),
    CONSTRAINT users_name_not_empty CHECK (
      LENGTH(TRIM(first_name)) > 0 AND 
      LENGTH(TRIM(last_name)) > 0
    ),
    
    -- Foreign key constraints (self-referencing)
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Indexes for optimal query performance on large datasets
 * Designed based on expected query patterns in the application
 */
export const USERS_TABLE_INDEXES = [
  // Primary email lookup (most common operation)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`,

  // Role-based queries for authorization
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,

  // Status filtering for active user queries
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,

  // Security: locked account queries
  `CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;`,

  // Audit: creation tracking
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);`,

  // Composite index for active users by role (common query pattern)
  `CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);`,

  // Login tracking for analytics
  `CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);`,

  // Full-text search on names (for user management UI)
  `CREATE INDEX IF NOT EXISTS idx_users_fullname ON users(first_name, last_name);`,

  // Version for optimistic locking queries
  `CREATE INDEX IF NOT EXISTS idx_users_version ON users(id, version);`,
];

/**
 * User sessions table for authentication token management
 * Separate table for better normalization and security
 */
export const USER_SESSIONS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL, -- Unix timestamp
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT sessions_expires_future CHECK (expires_at > created_at),
    CONSTRAINT sessions_is_active_boolean CHECK (is_active IN (0, 1))
  ) STRICT;
`;

/**
 * Session table indexes for performance
 */
export const USER_SESSIONS_TABLE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active, user_id) WHERE is_active = 1;`,
];

/**
 * Audit log table for compliance and security tracking
 * Separate table for optimal performance on main operations
 */
export const AUDIT_LOG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_values TEXT NULL, -- JSON
    new_values TEXT NULL, -- JSON
    changed_by TEXT NULL, -- User ID
    changed_at INTEGER NOT NULL, -- Unix timestamp
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    
    -- Constraints
    CONSTRAINT audit_operation_valid CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Foreign key to users (optional, for system operations)
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Audit log indexes for compliance queries
 */
export const AUDIT_LOG_TABLE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON audit_log(changed_by);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON audit_log(changed_at);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit_log(operation);`,
];

/**
 * Database schema version for migration management
 */
export const SCHEMA_VERSION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    applied_at INTEGER NOT NULL,
    applied_by TEXT NOT NULL DEFAULT 'system',
    checksum TEXT NOT NULL
  ) STRICT;
`;

/**
 * Complete schema creation order (respects foreign key dependencies)
 */
export const SCHEMA_CREATION_ORDER = [
  // Core authentication tables first
  USERS_TABLE_SCHEMA,
  USER_SESSIONS_TABLE_SCHEMA,
  AUDIT_LOG_TABLE_SCHEMA,
  SCHEMA_VERSION_TABLE_SCHEMA,

  // Business entity tables (respecting foreign key dependencies)
  ...BUSINESS_SCHEMAS,

  // Then indexes for optimal performance
  ...USERS_TABLE_INDEXES,
  ...USER_SESSIONS_TABLE_INDEXES,
  ...AUDIT_LOG_TABLE_INDEXES,
  ...BUSINESS_INDEXES,
];

/**
 * Performance optimization queries for large datasets
 */
export const PERFORMANCE_OPTIMIZATIONS = [
  // Analyze core tables for query optimizer
  `ANALYZE users;`,
  `ANALYZE user_sessions;`,
  `ANALYZE audit_log;`,

  // Analyze business tables for optimal query planning
  `ANALYZE agencies;`,
  `ANALYZE areas;`,
  `ANALYZE workers;`,
  `ANALYZE customers;`,
  `ANALYZE products;`,
  `ANALYZE inventory;`,
  `ANALYZE orders;`,
  `ANALYZE order_items;`,

  // Note: VACUUM cannot be run within a transaction, so it's executed separately
];

/**
 * Triggers for audit logging (automatic change tracking)
 */
export const AUDIT_TRIGGERS = [
  // User table audit trigger for INSERT
  `CREATE TRIGGER IF NOT EXISTS audit_users_insert
   AFTER INSERT ON users
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, new_values, 
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))),
       'users',
       NEW.id,
       'INSERT',
       json_object(
         'id', NEW.id,
         'email', NEW.email,
         'role', NEW.role,
         'status', NEW.status,
         'created_at', NEW.created_at
       ),
       NEW.created_by,
       unixepoch()
     );
   END;`,

  // User table audit trigger for UPDATE
  `CREATE TRIGGER IF NOT EXISTS audit_users_update
   AFTER UPDATE ON users
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values, new_values,
       changed_by, changed_at
     ) VALUES (
       lower(hex(randomblob(16))),
       'users',
       NEW.id,
       'UPDATE',
       json_object(
         'email', OLD.email,
         'role', OLD.role,
         'status', OLD.status,
         'version', OLD.version
       ),
       json_object(
         'email', NEW.email,
         'role', NEW.role,
         'status', NEW.status,
         'version', NEW.version
       ),
       NEW.updated_by,
       unixepoch()
     );
   END;`,

  // User table audit trigger for DELETE
  `CREATE TRIGGER IF NOT EXISTS audit_users_delete
   BEFORE DELETE ON users
   BEGIN
     INSERT INTO audit_log (
       id, table_name, record_id, operation, old_values,
       changed_at
     ) VALUES (
       lower(hex(randomblob(16))),
       'users',
       OLD.id,
       'DELETE',
       json_object(
         'id', OLD.id,
         'email', OLD.email,
         'role', OLD.role,
         'status', OLD.status
       ),
       unixepoch()
     );
   END;`,
];

/**
 * Schema validation queries to ensure data integrity
 */
export const SCHEMA_VALIDATION_QUERIES = [
  // Check foreign key constraints
  `PRAGMA foreign_key_check;`,

  // Check index integrity
  `PRAGMA integrity_check;`,

  // Verify table structure
  `PRAGMA table_info(users);`,
  `PRAGMA table_info(user_sessions);`,
  `PRAGMA table_info(audit_log);`,
];

/**
 * Database statistics queries for monitoring
 */
export const DATABASE_STATS_QUERIES = {
  // Core system stats
  userCount: `SELECT COUNT(*) as count FROM users;`,
  activeUserCount: `SELECT COUNT(*) as count FROM users WHERE status = 'active';`,
  sessionCount: `SELECT COUNT(*) as count FROM user_sessions WHERE is_active = TRUE;`,
  auditLogCount: `SELECT COUNT(*) as count FROM audit_log;`,

  // Business entity stats
  agencyCount: `SELECT COUNT(*) as count FROM agencies;`,
  activeAgencyCount: `SELECT COUNT(*) as count FROM agencies WHERE status = 'active';`,
  areaCount: `SELECT COUNT(*) as count FROM areas;`,
  workerCount: `SELECT COUNT(*) as count FROM workers;`,
  activeWorkerCount: `SELECT COUNT(*) as count FROM workers WHERE status = 'active';`,
  customerCount: `SELECT COUNT(*) as count FROM customers;`,
  activeCustomerCount: `SELECT COUNT(*) as count FROM customers WHERE status = 'active';`,
  productCount: `SELECT COUNT(*) as count FROM products;`,
  activeProductCount: `SELECT COUNT(*) as count FROM products WHERE status = 'active';`,
  inventoryCount: `SELECT COUNT(*) as count FROM inventory;`,
  lowStockCount: `SELECT COUNT(*) as count FROM inventory WHERE (available_boxes + available_loose) <= minimum_stock_level;`,
  orderCount: `SELECT COUNT(*) as count FROM orders;`,
  pendingOrderCount: `SELECT COUNT(*) as count FROM orders WHERE status = 'pending';`,
  todayOrderCount: `SELECT COUNT(*) as count FROM orders WHERE DATE(order_date, 'unixepoch') = DATE('now');`,
  orderItemCount: `SELECT COUNT(*) as count FROM order_items;`,

  // Performance and storage stats
  databaseSize: `SELECT page_count * page_size as size_bytes FROM pragma_page_count(), pragma_page_size();`,
  tableStats: `
    SELECT 
      name as table_name,
      (SELECT COUNT(*) FROM pragma_table_info(name)) as column_count
    FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%';
  `,

  // Business insights
  totalOrderValue: `SELECT COALESCE(SUM(total_amount), 0) as total_value FROM orders;`,
  todayOrderValue: `SELECT COALESCE(SUM(total_amount), 0) as total_value FROM orders WHERE DATE(order_date, 'unixepoch') = DATE('now');`,
  avgOrderValue: `SELECT COALESCE(AVG(total_amount), 0) as avg_value FROM orders;`,
  topCustomersByOrders: `
    SELECT customer_name, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as total_value
    FROM orders 
    GROUP BY customer_id, customer_name 
    ORDER BY order_count DESC 
    LIMIT 10;
  `,
  topProductsBySales: `
    SELECT oi.product_name, SUM(oi.quantity_boxes + oi.quantity_loose) as total_quantity, 
           COALESCE(SUM(oi.item_total), 0) as total_value
    FROM order_items oi
    GROUP BY oi.product_id, oi.product_name
    ORDER BY total_value DESC
    LIMIT 10;
  `,
};
