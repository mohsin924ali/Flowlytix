/**
 * Employee Database Schema
 * Enterprise-grade schema for employee business data management
 * Following Domain-Driven Design (DDD) and Database normalization principles
 *
 * Note: Employees are business entities, NOT user accounts
 * This schema is for operational workforce data used in business flows
 *
 * @version 1.0.0
 * @compliance GDPR ready with proper data handling
 * @performance Optimized for large datasets with proper indexing
 */

/**
 * Employee table schema
 * Normalized for optimal performance and data integrity
 * Following SOLID principles and enterprise database standards
 */
export const EMPLOYEES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS employees (
    -- Primary identification (UUID for distributed systems)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Business identifier (human-readable)
    employee_id TEXT NOT NULL,
    
    -- Personal information (normalized)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Contact information
    phone_number TEXT,
    address TEXT,
    
    -- Employment details
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    hire_date INTEGER NOT NULL, -- Unix timestamp for performance
    salary REAL, -- Optional, stored as REAL for precision
    
    -- Agency relationship (multi-tenant architecture)
    agency_id TEXT NOT NULL,
    
    -- Status management
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Audit fields (compliance and tracking)
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_at INTEGER NOT NULL, -- Unix timestamp
    created_by TEXT NOT NULL, -- User ID who created this employee
    
    -- Version control for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Data integrity constraints
    CONSTRAINT employees_status_valid CHECK (
      status IN ('active', 'inactive', 'terminated', 'on_leave')
    ),
    CONSTRAINT employees_department_valid CHECK (
      department IN (
        'sales', 
        'warehouse', 
        'customer_service', 
        'administration', 
        'quality_control', 
        'shipping'
      )
    ),
    CONSTRAINT employees_employee_id_not_empty CHECK (
      LENGTH(TRIM(employee_id)) > 0
    ),
    CONSTRAINT employees_first_name_not_empty CHECK (
      LENGTH(TRIM(first_name)) > 0
    ),
    CONSTRAINT employees_last_name_not_empty CHECK (
      LENGTH(TRIM(last_name)) > 0
    ),
    CONSTRAINT employees_position_not_empty CHECK (
      LENGTH(TRIM(position)) > 0
    ),
    CONSTRAINT employees_email_format CHECK (
      email LIKE '%@%' AND LENGTH(TRIM(email)) > 5
    ),
    CONSTRAINT employees_salary_positive CHECK (
      salary IS NULL OR salary >= 0
    ),
    CONSTRAINT employees_hire_date_reasonable CHECK (
      hire_date >= 946684800 -- Year 2000 Unix timestamp (reasonable business constraint)
    ),
    CONSTRAINT employees_phone_format CHECK (
      phone_number IS NULL OR LENGTH(TRIM(phone_number)) >= 10
    ),
    
    -- Foreign key constraints (referential integrity)
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraints (business rules)
    UNIQUE(agency_id, employee_id), -- Employee ID unique within agency
    UNIQUE(agency_id, email) -- Email unique within agency
  ) STRICT;
`;

/**
 * Employee table indexes for optimal query performance
 * Designed based on expected query patterns from business requirements
 * Following performance optimization principles from Instructions
 */
export const EMPLOYEES_TABLE_INDEXES = [
  // Primary lookup by employee ID within agency (most common operation)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_agency_employee_id 
   ON employees(agency_id, employee_id);`,

  // Email lookup within agency (for communication and validation)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_agency_email 
   ON employees(agency_id, email);`,

  // Department-based queries (for department management)
  `CREATE INDEX IF NOT EXISTS idx_employees_agency_department 
   ON employees(agency_id, department);`,

  // Status filtering for active employee queries (performance critical)
  `CREATE INDEX IF NOT EXISTS idx_employees_agency_status 
   ON employees(agency_id, status);`,

  // Composite index for active employees by department (common business query)
  `CREATE INDEX IF NOT EXISTS idx_employees_agency_department_status 
   ON employees(agency_id, department, status);`,

  // Position-based queries (for role management)
  `CREATE INDEX IF NOT EXISTS idx_employees_agency_position 
   ON employees(agency_id, position);`,

  // Hire date for tenure and analytics queries
  `CREATE INDEX IF NOT EXISTS idx_employees_hire_date 
   ON employees(hire_date);`,

  // Full-text search on names (for employee search UI)
  `CREATE INDEX IF NOT EXISTS idx_employees_fullname 
   ON employees(agency_id, first_name, last_name);`,

  // Audit and tracking indexes
  `CREATE INDEX IF NOT EXISTS idx_employees_created_at 
   ON employees(created_at);`,

  `CREATE INDEX IF NOT EXISTS idx_employees_created_by 
   ON employees(created_by);`,

  // Version for optimistic locking (concurrency control)
  `CREATE INDEX IF NOT EXISTS idx_employees_version 
   ON employees(id, version);`,

  // Composite index for active employees (excludes terminated/inactive)
  `CREATE INDEX IF NOT EXISTS idx_employees_active 
   ON employees(agency_id, status) WHERE status = 'active';`,

  // Department analytics index (for reporting)
  `CREATE INDEX IF NOT EXISTS idx_employees_department_analytics 
   ON employees(agency_id, department, status, hire_date);`,
];

/**
 * Employee audit table for compliance and change tracking
 * Separate table following normalization principles
 * Supports GDPR compliance and audit requirements
 */
export const EMPLOYEE_AUDIT_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS employee_audit (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Reference to employee
    employee_id TEXT NOT NULL,
    
    -- Audit information
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    field_name TEXT, -- Which field was changed (for UPDATE operations)
    old_value TEXT, -- Previous value (JSON for complex data)
    new_value TEXT, -- New value (JSON for complex data)
    
    -- Audit metadata
    changed_by TEXT, -- User ID who made the change
    changed_at INTEGER NOT NULL, -- Unix timestamp
    ip_address TEXT, -- For security tracking
    user_agent TEXT, -- Client information
    reason TEXT, -- Optional reason for change
    
    -- Constraints
    CONSTRAINT employee_audit_operation_valid CHECK (
      operation IN ('INSERT', 'UPDATE', 'DELETE')
    ),
    
    -- Foreign key constraints
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;
`;

/**
 * Employee audit table indexes for compliance queries
 */
export const EMPLOYEE_AUDIT_TABLE_INDEXES = [
  // Primary lookup by employee
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_employee_id 
   ON employee_audit(employee_id);`,

  // Audit queries by user (who made changes)
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_changed_by 
   ON employee_audit(changed_by);`,

  // Time-based audit queries
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_changed_at 
   ON employee_audit(changed_at);`,

  // Operation type filtering
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_operation 
   ON employee_audit(operation);`,

  // Field-specific change tracking
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_field_changes 
   ON employee_audit(employee_id, field_name, changed_at);`,

  // Composite index for employee change history
  `CREATE INDEX IF NOT EXISTS idx_employee_audit_history 
   ON employee_audit(employee_id, changed_at, operation);`,
];

/**
 * Employee performance metrics table (optional future extension)
 * Following single responsibility principle - separate concerns
 * Designed for analytics and performance tracking
 */
export const EMPLOYEE_METRICS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS employee_metrics (
    -- Primary identification
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Employee reference
    employee_id TEXT NOT NULL,
    
    -- Metrics period
    period_start INTEGER NOT NULL, -- Unix timestamp
    period_end INTEGER NOT NULL, -- Unix timestamp
    
    -- Performance data (extensible JSON for different department metrics)
    metrics_data TEXT NOT NULL, -- JSON object with department-specific KPIs
    
    -- Metadata
    calculated_at INTEGER NOT NULL, -- When metrics were calculated
    calculated_by TEXT, -- System or user who calculated
    
    -- Constraints
    CONSTRAINT employee_metrics_period_valid CHECK (
      period_end > period_start
    ),
    CONSTRAINT employee_metrics_data_not_empty CHECK (
      LENGTH(TRIM(metrics_data)) > 2 -- At least '{}' for empty JSON
    ),
    
    -- Foreign key constraints
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (calculated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraint (one metric record per employee per period)
    UNIQUE(employee_id, period_start, period_end)
  ) STRICT;
`;

/**
 * Employee metrics table indexes
 */
export const EMPLOYEE_METRICS_TABLE_INDEXES = [
  // Employee metrics lookup
  `CREATE INDEX IF NOT EXISTS idx_employee_metrics_employee_id 
   ON employee_metrics(employee_id);`,

  // Time-based metrics queries
  `CREATE INDEX IF NOT EXISTS idx_employee_metrics_period 
   ON employee_metrics(period_start, period_end);`,

  // Recent metrics queries
  `CREATE INDEX IF NOT EXISTS idx_employee_metrics_calculated_at 
   ON employee_metrics(calculated_at);`,

  // Composite index for employee performance over time
  `CREATE INDEX IF NOT EXISTS idx_employee_metrics_timeline 
   ON employee_metrics(employee_id, period_start, period_end);`,
];

/**
 * Complete employee schema collection for easy import
 * Following barrel exports pattern from Instructions
 */
export const EMPLOYEE_SCHEMAS = [EMPLOYEES_TABLE_SCHEMA, EMPLOYEE_AUDIT_TABLE_SCHEMA, EMPLOYEE_METRICS_TABLE_SCHEMA];

/**
 * Complete employee indexes collection
 */
export const EMPLOYEE_INDEXES = [
  ...EMPLOYEES_TABLE_INDEXES,
  ...EMPLOYEE_AUDIT_TABLE_INDEXES,
  ...EMPLOYEE_METRICS_TABLE_INDEXES,
];

/**
 * Schema creation order (respects foreign key dependencies)
 * Must be created after users and agencies tables
 */
export const EMPLOYEE_SCHEMA_CREATION_ORDER = [
  // Tables first (respecting dependencies)
  EMPLOYEES_TABLE_SCHEMA,
  EMPLOYEE_AUDIT_TABLE_SCHEMA,
  EMPLOYEE_METRICS_TABLE_SCHEMA,

  // Then indexes for optimal performance
  ...EMPLOYEE_INDEXES,
];

/**
 * Schema validation queries for testing and deployment
 * Following testing requirements from Instructions
 */
export const EMPLOYEE_SCHEMA_VALIDATION_QUERIES = [
  // Test table existence
  `SELECT name FROM sqlite_master WHERE type='table' AND name='employees';`,
  `SELECT name FROM sqlite_master WHERE type='table' AND name='employee_audit';`,
  `SELECT name FROM sqlite_master WHERE type='table' AND name='employee_metrics';`,

  // Test index existence
  `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='employees';`,

  // Test foreign key constraints
  `PRAGMA foreign_key_check(employees);`,
  `PRAGMA foreign_key_check(employee_audit);`,
  `PRAGMA foreign_key_check(employee_metrics);`,

  // Test table structure
  `PRAGMA table_info(employees);`,
  `PRAGMA table_info(employee_audit);`,
  `PRAGMA table_info(employee_metrics);`,
];

/**
 * Performance optimization constants
 * Following performance standards from Instructions
 */
export const EMPLOYEE_SCHEMA_PERFORMANCE_CONFIG = {
  // SQLite optimization settings for employee operations
  pragmaStatements: [
    'PRAGMA journal_mode = WAL;', // Write-Ahead Logging for better concurrency
    'PRAGMA synchronous = NORMAL;', // Balance between safety and performance
    'PRAGMA cache_size = 10000;', // 10MB cache for better query performance
    'PRAGMA temp_store = MEMORY;', // Use memory for temporary storage
    'PRAGMA mmap_size = 268435456;', // 256MB memory-mapped I/O
    'PRAGMA optimize;', // Auto-optimize indexes
  ],

  // Query performance targets (from Instructions)
  maxQueryTimeMs: 100, // Max 100ms for employee queries
  maxBatchSize: 1000, // Max 1000 employees per batch operation
  indexCoverageTarget: 95, // 95% of queries should use indexes
} as const;
