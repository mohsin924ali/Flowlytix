import { DatabaseConnection } from './connection';
import {
  SCHEMA_CREATION_ORDER,
  AUDIT_TRIGGERS,
  PERFORMANCE_OPTIMIZATIONS,
  SCHEMA_VALIDATION_QUERIES,
  SCHEMA_VERSION_TABLE_SCHEMA,
} from './schema';
import {
  BUSINESS_SCHEMAS,
  BUSINESS_INDEXES,
  BUSINESS_AUDIT_TRIGGERS,
  BUSINESS_PERFORMANCE_OPTIMIZATIONS,
  BUSINESS_VALIDATION_QUERIES,
} from './business-schema';
import { createHash } from 'crypto';

/**
 * Migration interface for type safety
 */
export interface Migration {
  readonly version: number;
  readonly description: string;
  readonly up: string[];
  readonly down: string[];
  readonly checksum: string;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  readonly version: number;
  readonly success: boolean;
  readonly executedAt: Date;
  readonly duration: number;
  readonly error?: string;
}

/**
 * Migration execution errors
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly version: number,
    public readonly cause?: Error
  ) {
    super(`Migration v${version} failed: ${message}`);
    this.name = 'MigrationError';
  }
}

export class MigrationValidationError extends Error {
  constructor(message: string) {
    super(`Migration validation failed: ${message}`);
    this.name = 'MigrationValidationError';
  }
}

/**
 * Enterprise-grade database migration manager
 * Handles schema versioning, rollbacks, and validation
 */
export class DatabaseMigration {
  private readonly connection: DatabaseConnection;
  private readonly migrations: Map<number, Migration> = new Map();

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.initializeMigrations();
  }

  /**
   * Run all pending migrations
   * @returns Promise<MigrationResult[]> - Results of executed migrations
   */
  public async migrate(): Promise<MigrationResult[]> {
    await this.ensureSchemaVersionTable();

    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.getPendingMigrations(currentVersion);

    if (pendingMigrations.length === 0) {
      return [];
    }

    const results: MigrationResult[] = [];
    const db = this.connection.getDatabase();

    // Execute migrations in transaction for atomicity
    const transaction = db.transaction((migrations: Migration[]) => {
      for (const migration of migrations) {
        const result = this.executeMigration(migration, 'up');
        results.push(result);

        if (!result.success) {
          throw new MigrationError(result.error || 'Unknown migration error', migration.version);
        }
      }
    });

    try {
      transaction(pendingMigrations);
      return results;
    } catch (error) {
      throw new MigrationError('Migration transaction failed', pendingMigrations[0]?.version || 0, error as Error);
    }
  }

  /**
   * Rollback to specific version
   * @param targetVersion - Version to rollback to
   * @returns Promise<MigrationResult[]> - Results of rollback operations
   */
  public async rollback(targetVersion: number): Promise<MigrationResult[]> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      throw new MigrationValidationError(
        `Cannot rollback to version ${targetVersion}. Current version is ${currentVersion}`
      );
    }

    const migrationsToRollback = this.getMigrationsToRollback(currentVersion, targetVersion);
    const results: MigrationResult[] = [];
    const db = this.connection.getDatabase();

    // Execute rollbacks in transaction
    const transaction = db.transaction((migrations: Migration[]) => {
      for (const migration of migrations) {
        const result = this.executeMigration(migration, 'down');
        results.push(result);

        if (!result.success) {
          throw new MigrationError(result.error || 'Unknown rollback error', migration.version);
        }
      }
    });

    try {
      transaction(migrationsToRollback);
      return results;
    } catch (error) {
      throw new MigrationError('Rollback transaction failed', migrationsToRollback[0]?.version || 0, error as Error);
    }
  }

  /**
   * Get current database version
   * @returns Promise<number> - Current version
   */
  public async getCurrentVersion(): Promise<number> {
    await this.ensureSchemaVersionTable();

    const db = this.connection.getDatabase();
    const result = db
      .prepare(
        `
      SELECT MAX(version) as version 
      FROM schema_version
    `
      )
      .get() as { version: number | null };

    return result.version || 0;
  }

  /**
   * Get migration status
   * @returns Promise<object> - Migration status information
   */
  public async getStatus(): Promise<{
    currentVersion: number;
    latestVersion: number;
    pendingMigrations: number;
    appliedMigrations: Migration[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = Math.max(...this.migrations.keys());
    const pendingCount = this.getPendingMigrations(currentVersion).length;
    const appliedMigrations = await this.getAppliedMigrations();

    return {
      currentVersion,
      latestVersion,
      pendingMigrations: pendingCount,
      appliedMigrations,
    };
  }

  /**
   * Validate database schema integrity
   * @returns Promise<boolean> - True if valid
   */
  public async validateSchema(): Promise<boolean> {
    const db = this.connection.getDatabase();

    try {
      // Check that essential tables exist
      const requiredTables = ['users', 'user_sessions', 'audit_log', 'schema_version'];
      const existingTables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
        .all() as { name: string }[];

      const existingTableNames = existingTables.map((t) => t.name);
      for (const table of requiredTables) {
        if (!existingTableNames.includes(table)) {
          return false;
        }
      }

      // Validate core schema
      for (const query of SCHEMA_VALIDATION_QUERIES) {
        const result = db.prepare(query).all();

        // Check for foreign key violations
        if (query.includes('foreign_key_check') && result.length > 0) {
          return false;
        }

        // Check table info queries return results
        if (query.includes('table_info')) {
          if (result.length === 0) {
            return false;
          }
        }
      }

      // Validate business schema
      for (const query of BUSINESS_VALIDATION_QUERIES) {
        const result = db.prepare(query).all() as { check_name: string; violations: number }[];

        // Check for business rule violations
        for (const row of result) {
          if (row.violations > 0) {
            console.warn(`Business validation failed: ${row.check_name} has ${row.violations} violations`);
            return false;
          }
        }
      }

      // Check for integrity issues in core validation queries
      for (const query of SCHEMA_VALIDATION_QUERIES) {
        if (query.includes('integrity_check')) {
          const result = db.prepare(query).all();
          const integrityResult = result[0] as { integrity_check?: string };
          if (integrityResult.integrity_check !== 'ok') {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize built-in migrations
   * @private
   */
  private initializeMigrations(): void {
    // Migration 1: Initial schema
    this.addMigration({
      version: 1,
      description: 'Initial database schema with users, sessions, and audit tables',
      up: SCHEMA_CREATION_ORDER,
      down: [
        'DROP TRIGGER IF EXISTS audit_users_delete;',
        'DROP TRIGGER IF EXISTS audit_users_update;',
        'DROP TRIGGER IF EXISTS audit_users_insert;',
        'DROP TABLE IF EXISTS audit_log;',
        'DROP TABLE IF EXISTS user_sessions;',
        'DROP TABLE IF EXISTS users;',
      ],
      checksum: this.generateChecksum(SCHEMA_CREATION_ORDER.join('\n')),
    });

    // Migration 2: Audit triggers
    this.addMigration({
      version: 2,
      description: 'Add audit triggers for automatic change tracking',
      up: AUDIT_TRIGGERS,
      down: [
        'DROP TRIGGER IF EXISTS audit_users_delete;',
        'DROP TRIGGER IF EXISTS audit_users_update;',
        'DROP TRIGGER IF EXISTS audit_users_insert;',
      ],
      checksum: this.generateChecksum(AUDIT_TRIGGERS.join('\n')),
    });

    // Migration 3: Performance optimizations
    this.addMigration({
      version: 3,
      description: 'Apply performance optimizations and analyze tables',
      up: PERFORMANCE_OPTIMIZATIONS,
      down: [], // Performance optimizations don't need rollback
      checksum: this.generateChecksum(PERFORMANCE_OPTIMIZATIONS.join('\n')),
    });

    // Migration 4: Business entity schemas (Phase 1 - Enhanced Database Foundation)
    this.addMigration({
      version: 4,
      description:
        'Add comprehensive business entity schemas for ERP system (agencies, areas, workers, customers, products, inventory, orders)',
      up: [...BUSINESS_SCHEMAS, ...BUSINESS_INDEXES],
      down: [
        // Drop business tables in reverse dependency order
        'DROP TABLE IF EXISTS order_items;',
        'DROP TABLE IF EXISTS orders;',
        'DROP TABLE IF EXISTS inventory;',
        'DROP TABLE IF EXISTS products;',
        'DROP TABLE IF EXISTS customers;',
        'DROP TABLE IF EXISTS workers;',
        'DROP TABLE IF EXISTS areas;',
        'DROP TABLE IF EXISTS agencies;',
      ],
      checksum: this.generateChecksum([...BUSINESS_SCHEMAS, ...BUSINESS_INDEXES].join('\n')),
    });

    // Migration 5: Business audit triggers
    this.addMigration({
      version: 5,
      description: 'Add comprehensive audit triggers for business entities',
      up: BUSINESS_AUDIT_TRIGGERS,
      down: [
        'DROP TRIGGER IF EXISTS audit_orders_status_update;',
        'DROP TRIGGER IF EXISTS audit_orders_insert;',
        'DROP TRIGGER IF EXISTS audit_inventory_update;',
        'DROP TRIGGER IF EXISTS audit_customers_update;',
        'DROP TRIGGER IF EXISTS audit_customers_insert;',
        'DROP TRIGGER IF EXISTS audit_agencies_update;',
        'DROP TRIGGER IF EXISTS audit_agencies_insert;',
      ],
      checksum: this.generateChecksum(BUSINESS_AUDIT_TRIGGERS.join('\n')),
    });

    // Migration 6: Business performance optimizations
    this.addMigration({
      version: 6,
      description: 'Apply performance optimizations for business entities',
      up: BUSINESS_PERFORMANCE_OPTIMIZATIONS,
      down: [], // Performance optimizations don't need rollback
      checksum: this.generateChecksum(BUSINESS_PERFORMANCE_OPTIMIZATIONS.join('\n')),
    });

    // Migration 7: Multi-tenant database support
    this.addMigration({
      version: 7,
      description: 'Add multi-tenant database support with connection pooling',
      up: [
        // Add agency database tracking
        `CREATE TABLE IF NOT EXISTS agency_databases (
          id TEXT PRIMARY KEY NOT NULL,
          agency_id TEXT NOT NULL,
          database_path TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'active',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_connected_at INTEGER,
          connection_count INTEGER NOT NULL DEFAULT 0,
          
          FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
          CONSTRAINT agency_databases_status_valid CHECK (status IN ('active', 'inactive', 'migrating', 'error'))
        ) STRICT;`,

        // Add agency database connection tracking
        `CREATE TABLE IF NOT EXISTS agency_database_connections (
          id TEXT PRIMARY KEY NOT NULL,
          agency_id TEXT NOT NULL,
          database_id TEXT NOT NULL,
          connected_at INTEGER NOT NULL,
          disconnected_at INTEGER,
          connection_status TEXT NOT NULL DEFAULT 'active',
          error_message TEXT,
          
          FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
          FOREIGN KEY (database_id) REFERENCES agency_databases(id) ON DELETE CASCADE,
          CONSTRAINT agency_connections_status_valid CHECK (connection_status IN ('active', 'closed', 'error'))
        ) STRICT;`,

        // Add indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_agency_databases_agency ON agency_databases(agency_id);`,
        `CREATE INDEX IF NOT EXISTS idx_agency_databases_status ON agency_databases(status);`,
        `CREATE INDEX IF NOT EXISTS idx_agency_databases_path ON agency_databases(database_path);`,
        `CREATE INDEX IF NOT EXISTS idx_agency_connections_agency ON agency_database_connections(agency_id);`,
        `CREATE INDEX IF NOT EXISTS idx_agency_connections_database ON agency_database_connections(database_id);`,
        `CREATE INDEX IF NOT EXISTS idx_agency_connections_status ON agency_database_connections(connection_status);`,

        // Add triggers for audit logging
        `CREATE TRIGGER IF NOT EXISTS audit_agency_databases_insert
         AFTER INSERT ON agency_databases
         BEGIN
           INSERT INTO audit_log (
             id, table_name, record_id, operation, new_values, 
             changed_at
           ) VALUES (
             lower(hex(randomblob(16))), 'agency_databases', NEW.id, 'INSERT',
             json_object('agency_id', NEW.agency_id, 'database_path', NEW.database_path, 'status', NEW.status),
             unixepoch()
           );
         END;`,

        `CREATE TRIGGER IF NOT EXISTS audit_agency_databases_update
         AFTER UPDATE ON agency_databases
         BEGIN
           INSERT INTO audit_log (
             id, table_name, record_id, operation, old_values, new_values,
             changed_at
           ) VALUES (
             lower(hex(randomblob(16))), 'agency_databases', NEW.id, 'UPDATE',
             json_object('status', OLD.status, 'last_connected_at', OLD.last_connected_at),
             json_object('status', NEW.status, 'last_connected_at', NEW.last_connected_at),
             unixepoch()
           );
         END;`,

        `CREATE TRIGGER IF NOT EXISTS audit_agency_connections_insert
         AFTER INSERT ON agency_database_connections
         BEGIN
           INSERT INTO audit_log (
             id, table_name, record_id, operation, new_values, 
             changed_at
           ) VALUES (
             lower(hex(randomblob(16))), 'agency_database_connections', NEW.id, 'INSERT',
             json_object('agency_id', NEW.agency_id, 'database_id', NEW.database_id, 
                        'connection_status', NEW.connection_status),
             unixepoch()
           );
         END;`,

        `CREATE TRIGGER IF NOT EXISTS audit_agency_connections_update
         AFTER UPDATE ON agency_database_connections
         BEGIN
           INSERT INTO audit_log (
             id, table_name, record_id, operation, old_values, new_values,
             changed_at
           ) VALUES (
             lower(hex(randomblob(16))), 'agency_database_connections', NEW.id, 'UPDATE',
             json_object('connection_status', OLD.connection_status, 'disconnected_at', OLD.disconnected_at),
             json_object('connection_status', NEW.connection_status, 'disconnected_at', NEW.disconnected_at),
             unixepoch()
           );
         END;`,
      ],
      down: [
        'DROP TRIGGER IF EXISTS audit_agency_connections_update;',
        'DROP TRIGGER IF EXISTS audit_agency_connections_insert;',
        'DROP TRIGGER IF EXISTS audit_agency_databases_update;',
        'DROP TRIGGER IF EXISTS audit_agency_databases_insert;',
        'DROP TABLE IF EXISTS agency_database_connections;',
        'DROP TABLE IF EXISTS agency_databases;',
      ],
      checksum: this.generateChecksum(
        ['agency_databases', 'agency_database_connections', 'audit_agency_databases', 'audit_agency_connections'].join(
          '\n'
        )
      ),
    });

    // Migration 8: Phase 2 Order Processing - Lot allocation persistence
    this.addMigration({
      version: 8,
      description: 'Phase 2: Add order item lot allocation persistence for complete inventory traceability',
      up: [
        'CREATE TABLE IF NOT EXISTS order_item_lot_allocations (' +
          '  id TEXT PRIMARY KEY NOT NULL,' +
          '  order_id TEXT NOT NULL,' +
          '  order_item_id TEXT NOT NULL,' +
          '  lot_batch_id TEXT NOT NULL,' +
          '  lot_number TEXT NOT NULL,' +
          '  batch_number TEXT,' +
          '  allocated_quantity INTEGER NOT NULL,' +
          '  manufacturing_date INTEGER NOT NULL,' +
          '  expiry_date INTEGER,' +
          '  reserved_at INTEGER NOT NULL,' +
          '  reserved_by TEXT NOT NULL,' +
          '  created_at INTEGER NOT NULL DEFAULT (unixepoch()),' +
          '  updated_at INTEGER,' +
          '  CONSTRAINT order_lot_allocations_allocated_quantity_positive CHECK (allocated_quantity > 0),' +
          '  CONSTRAINT order_lot_allocations_lot_number_not_empty CHECK (LENGTH(TRIM(lot_number)) > 0),' +
          '  CONSTRAINT order_lot_allocations_lot_number_length CHECK (LENGTH(lot_number) <= 50),' +
          '  CONSTRAINT order_lot_allocations_batch_number_length CHECK (batch_number IS NULL OR LENGTH(batch_number) <= 50),' +
          '  CONSTRAINT order_lot_allocations_expiry_after_manufacturing CHECK (expiry_date IS NULL OR expiry_date > manufacturing_date),' +
          '  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,' +
          '  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,' +
          '  FOREIGN KEY (lot_batch_id) REFERENCES lot_batches(id) ON DELETE RESTRICT,' +
          '  FOREIGN KEY (reserved_by) REFERENCES users(id) ON DELETE SET NULL' +
          ') STRICT;',

        // Indexes for lot allocation table
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_id ON order_item_lot_allocations(order_id);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_item_id ON order_item_lot_allocations(order_item_id);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_batch_id ON order_item_lot_allocations(lot_batch_id);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_number ON order_item_lot_allocations(lot_number);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_reserved_at ON order_item_lot_allocations(reserved_at);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_reserved_by ON order_item_lot_allocations(reserved_by);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_manufacturing_date ON order_item_lot_allocations(manufacturing_date);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_expiry_date ON order_item_lot_allocations(expiry_date);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_order_tracking ON order_item_lot_allocations(order_id, order_item_id, lot_batch_id);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_lot_tracking ON order_item_lot_allocations(lot_batch_id, reserved_at, allocated_quantity);',
        'CREATE INDEX IF NOT EXISTS idx_order_lot_allocations_expiring_lots ON order_item_lot_allocations(expiry_date, order_id, lot_number);',

        // Audit triggers for lot allocation table
        'CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_insert' +
          ' AFTER INSERT ON order_item_lot_allocations' +
          ' BEGIN' +
          '   INSERT INTO audit_log (' +
          '     id, table_name, record_id, operation, new_values,' +
          '     changed_by, changed_at' +
          '   ) VALUES (' +
          "     lower(hex(randomblob(16))), 'order_item_lot_allocations', NEW.id, 'INSERT'," +
          "     json_object('order_id', NEW.order_id, 'order_item_id', NEW.order_item_id," +
          "                 'lot_batch_id', NEW.lot_batch_id, 'lot_number', NEW.lot_number," +
          "                 'allocated_quantity', NEW.allocated_quantity)," +
          '     NEW.reserved_by, unixepoch()' +
          '   );' +
          ' END;',

        'CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_update' +
          ' AFTER UPDATE OF allocated_quantity ON order_item_lot_allocations' +
          ' BEGIN' +
          '   INSERT INTO audit_log (' +
          '     id, table_name, record_id, operation, old_values, new_values,' +
          '     changed_by, changed_at' +
          '   ) VALUES (' +
          "     lower(hex(randomblob(16))), 'order_item_lot_allocations', NEW.id, 'UPDATE'," +
          "     json_object('allocated_quantity', OLD.allocated_quantity)," +
          "     json_object('allocated_quantity', NEW.allocated_quantity)," +
          '     NEW.reserved_by, unixepoch()' +
          '   );' +
          ' END;',

        'CREATE TRIGGER IF NOT EXISTS audit_order_lot_allocations_delete' +
          ' BEFORE DELETE ON order_item_lot_allocations' +
          ' BEGIN' +
          '   INSERT INTO audit_log (' +
          '     id, table_name, record_id, operation, old_values,' +
          '     changed_by, changed_at' +
          '   ) VALUES (' +
          "     lower(hex(randomblob(16))), 'order_item_lot_allocations', OLD.id, 'DELETE'," +
          "     json_object('order_id', OLD.order_id, 'order_item_id', OLD.order_item_id," +
          "                 'lot_batch_id', OLD.lot_batch_id, 'lot_number', OLD.lot_number," +
          "                 'allocated_quantity', OLD.allocated_quantity)," +
          '     OLD.reserved_by, unixepoch()' +
          '   );' +
          ' END;',
      ],
      down: [
        'DROP TRIGGER IF EXISTS audit_order_lot_allocations_delete;',
        'DROP TRIGGER IF EXISTS audit_order_lot_allocations_update;',
        'DROP TRIGGER IF EXISTS audit_order_lot_allocations_insert;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_expiring_lots;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_lot_tracking;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_order_tracking;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_expiry_date;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_manufacturing_date;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_reserved_by;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_reserved_at;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_lot_number;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_lot_batch_id;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_order_item_id;',
        'DROP INDEX IF EXISTS idx_order_lot_allocations_order_id;',
        'DROP TABLE IF EXISTS order_item_lot_allocations;',
      ],
      checksum: this.generateChecksum('order_item_lot_allocations_migration_v7'),
    });
  }

  /**
   * Add a migration to the registry
   * @param migration - Migration to add
   * @private
   */
  private addMigration(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new MigrationValidationError(`Migration version ${migration.version} already exists`);
    }

    this.migrations.set(migration.version, migration);
  }

  /**
   * Execute a single migration
   * @param migration - Migration to execute
   * @param direction - 'up' or 'down'
   * @returns MigrationResult
   * @private
   */
  private executeMigration(migration: Migration, direction: 'up' | 'down'): MigrationResult {
    const startTime = Date.now();
    const db = this.connection.getDatabase();

    try {
      const queries = direction === 'up' ? migration.up : migration.down;

      // Execute all queries in the migration
      for (const query of queries) {
        if (query.trim()) {
          db.exec(query);
        }
      }

      // Update schema version table
      if (direction === 'up') {
        this.recordMigration(migration);
      } else {
        this.removeMigrationRecord(migration.version);
      }

      const duration = Date.now() - startTime;

      return {
        version: migration.version,
        success: true,
        executedAt: new Date(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        version: migration.version,
        success: false,
        executedAt: new Date(),
        duration,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Record migration in schema_version table
   * @param migration - Migration to record
   * @private
   */
  private recordMigration(migration: Migration): void {
    const db = this.connection.getDatabase();

    db.prepare(
      `
      INSERT INTO schema_version (version, description, applied_at, checksum)
      VALUES (?, ?, ?, ?)
    `
    ).run(migration.version, migration.description, Math.floor(Date.now() / 1000), migration.checksum);
  }

  /**
   * Remove migration record from schema_version table
   * @param version - Version to remove
   * @private
   */
  private removeMigrationRecord(version: number): void {
    const db = this.connection.getDatabase();

    db.prepare(
      `
      DELETE FROM schema_version WHERE version = ?
    `
    ).run(version);
  }

  /**
   * Ensure schema_version table exists
   * @private
   */
  private async ensureSchemaVersionTable(): Promise<void> {
    const db = this.connection.getDatabase();
    db.exec(SCHEMA_VERSION_TABLE_SCHEMA);
  }

  /**
   * Get pending migrations
   * @param currentVersion - Current database version
   * @returns Array of pending migrations
   * @private
   */
  private getPendingMigrations(currentVersion: number): Migration[] {
    return Array.from(this.migrations.values())
      .filter((migration) => migration.version > currentVersion)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get migrations to rollback
   * @param currentVersion - Current version
   * @param targetVersion - Target version
   * @returns Array of migrations to rollback
   * @private
   */
  private getMigrationsToRollback(currentVersion: number, targetVersion: number): Migration[] {
    return Array.from(this.migrations.values())
      .filter((migration) => migration.version > targetVersion && migration.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Reverse order for rollback
  }

  /**
   * Get applied migrations from database
   * @returns Promise<Migration[]> - Applied migrations
   * @private
   */
  private async getAppliedMigrations(): Promise<Migration[]> {
    const db = this.connection.getDatabase();

    const appliedVersions = db
      .prepare(
        `
      SELECT version FROM schema_version ORDER BY version
    `
      )
      .all() as { version: number }[];

    return appliedVersions
      .map((row) => this.migrations.get(row.version))
      .filter((migration): migration is Migration => migration !== undefined);
  }

  /**
   * Generate checksum for migration validation
   * @param content - Content to hash
   * @returns Checksum string
   * @private
   */
  private generateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

/**
 * Factory function to create migration manager
 * @param connection - Database connection
 * @returns DatabaseMigration instance
 */
export function createMigrationManager(connection: DatabaseConnection): DatabaseMigration {
  return new DatabaseMigration(connection);
}
