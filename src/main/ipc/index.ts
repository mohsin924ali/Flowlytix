/**
 * Unified CQRS IPC Handlers System - Phase 1.1: Conflict Removal
 *
 * Central registration point for all CQRS-based IPC handlers.
 * This replaces the previous conflicting simple handlers with a clean foundation.
 * Phase 1.1 Focus: Remove conflicts, prepare infrastructure for gradual CQRS migration.
 *
 * @architecture CQRS Pattern (Incremental Implementation)
 * @version 2.0.0 - Phase 1.1
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { pbkdf2Sync, randomBytes } from 'crypto';

/**
 * Database connection
 */
let db: Database.Database;

/**
 * CQRS Handler instances (will be initialized in future phases)
 */
let authHandler: any;
let agencyHandler: any;
let databaseHandler: any;
// Additional handlers will be added in future phases

/**
 * Initialize and register all CQRS IPC handlers
 */
export async function registerIpcHandlers(): Promise<void> {
  console.log('🚀 Initializing CQRS IPC system (Phase 1.1)...');

  try {
    // Initialize database first
    await initializeDatabase();

    // Initialize CQRS handlers incrementally (Phase 1.1: Basic setup only)
    console.log('🔗 Preparing CQRS handler infrastructure...');
    await initializeCQRSHandlers();

    console.log('✅ CQRS IPC system Phase 1.1 initialized successfully');

    // Initialize default super admin if no users exist
    await initializeDefaultSuperAdmin();
  } catch (error) {
    console.error('❌ Failed to initialize CQRS IPC system:', error);
    throw error;
  }
}

/**
 * Initialize CQRS handlers incrementally
 * Phase 1.1: Setup infrastructure with basic working handlers
 */
async function initializeCQRSHandlers(): Promise<void> {
  try {
    console.log('📦 Phase 1.1: Setting up CQRS infrastructure...');

    // Phase 1.1: Register essential working handlers first
    await registerBasicAuthHandler();
    await registerBasicAgencyHandler();
    await registerPlaceholderHandlers();

    // Phase 1.1: Database handler will be implemented in Phase 1.2
    // TODO: Implement DatabaseIpcHandler with proper dependency injection in Phase 1.2
    console.log('📝 Database CQRS handler will be implemented in Phase 1.2');

    console.log('📋 Phase 1.1 Complete: Essential handlers working, ready for Phase 1.2');
  } catch (error) {
    console.error('Error initializing CQRS handlers:', error);
    // Continue execution - we want partial functionality rather than complete failure
  }
}

/**
 * Register basic authentication handler for Phase 1.1
 * This provides working authentication while we complete the CQRS migration
 */
async function registerBasicAuthHandler(): Promise<void> {
  const { ipcMain } = await import('electron');
  const { z } = await import('zod');

  // Input validation schema
  const AuthenticateUserRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  // Register the auth:authenticate-user handler
  ipcMain.handle('auth:authenticate-user', async (event, request) => {
    try {
      console.log('🔐 Phase 1.1 Auth Handler: Authentication request received');

      const validatedRequest = AuthenticateUserRequestSchema.parse(request);

      // Get user from database
      const user = db
        .prepare('SELECT * FROM users WHERE email = ? AND status = ?')
        .get(validatedRequest.email, 'active') as any;

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
          timestamp: Date.now(),
        };
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > Date.now()) {
        return {
          success: false,
          message: 'Account is temporarily locked. Please try again later.',
          timestamp: Date.now(),
        };
      }

      // Verify password
      const hashedPassword = pbkdf2Sync(validatedRequest.password, user.password_salt, 10000, 64, 'sha512').toString(
        'hex'
      );

      if (hashedPassword !== user.password_hash) {
        // Increment login attempts
        const newAttempts = user.login_attempts + 1;
        const lockUntil = newAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;

        db.prepare('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?').run(
          newAttempts,
          lockUntil,
          user.id
        );

        return {
          success: false,
          message: 'Invalid email or password',
          attemptsRemaining: Math.max(0, 5 - newAttempts),
          timestamp: Date.now(),
        };
      }

      // Reset login attempts and update last login
      db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?').run(
        Date.now(),
        user.id
      );

      const successResponse = {
        success: true,
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          agencyId: user.agency_id,
          permissions: ['read', 'write'], // Basic permissions for now
        },
        timestamp: Date.now(),
      };

      console.log('✅ Phase 1.1 Auth Handler: Authentication successful');
      return successResponse;
    } catch (error) {
      console.error('❌ Phase 1.1 Auth Handler: Authentication failed:', error);
      return {
        success: false,
        message: 'Authentication failed',
        timestamp: Date.now(),
      };
    }
  });

  // Register other auth handlers
  ipcMain.handle('auth:create-user', async (event, request) => {
    console.log('📝 Phase 1.1: auth:create-user handler called');
    return { success: false, message: 'User creation will be implemented in Phase 1.2' };
  });

  ipcMain.handle('auth:list-users', async (event, request) => {
    console.log('📝 Phase 1.1: auth:list-users handler called');
    return { success: false, message: 'User listing will be implemented in Phase 1.2' };
  });

  ipcMain.handle('auth:get-user-permissions', async (event, request) => {
    console.log('📝 Phase 1.1: auth:get-user-permissions handler called');
    return { permissions: ['read', 'write'] };
  });

  console.log('✅ Phase 1.1: Basic authentication handlers registered');
}

/**
 * Register basic agency handler for Phase 1.1
 */
async function registerBasicAgencyHandler(): Promise<void> {
  const { ipcMain } = await import('electron');

  ipcMain.handle('agency:get-agencies', async (event, request) => {
    try {
      const agencies = db.prepare('SELECT * FROM agencies ORDER BY created_at DESC').all() as any[];

      return {
        success: true,
        agencies: agencies.map((agency) => ({
          id: agency.id,
          name: agency.name,
          contactPerson: agency.contact_person,
          phone: agency.phone,
          email: agency.email,
          address: agency.address,
          status: agency.status,
          createdAt: new Date(agency.created_at).toISOString(),
        })),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Agency handler error:', error);
      return {
        success: false,
        error: 'Failed to get agencies',
        timestamp: Date.now(),
      };
    }
  });

  ipcMain.handle('agency:create-agency', async (event, request) => {
    console.log('📝 Phase 1.1: agency:create-agency handler called');
    return { success: false, message: 'Agency creation will be implemented in Phase 1.2' };
  });

  ipcMain.handle('agency:get-agency-by-id', async (event, request) => {
    console.log('📝 Phase 1.1: agency:get-agency-by-id handler called');
    return { success: false, message: 'Agency details will be implemented in Phase 1.2' };
  });

  ipcMain.handle('agency:update-agency', async (event, request) => {
    console.log('📝 Phase 1.1: agency:update-agency handler called');
    return { success: false, message: 'Agency updates will be implemented in Phase 1.2' };
  });

  console.log('✅ Phase 1.1: Basic agency handlers registered');
}

/**
 * Register placeholder handlers for other domains (Phase 1.1)
 * These prevent "handler not found" errors while we complete the CQRS migration
 */
async function registerPlaceholderHandlers(): Promise<void> {
  const { ipcMain } = await import('electron');

  // Inventory/Product handlers
  ipcMain.handle('inventory:get-products', async () => ({
    success: false,
    message: 'Products will be implemented in Phase 1.2',
  }));
  ipcMain.handle('inventory:create-product', async () => ({
    success: false,
    message: 'Product creation will be implemented in Phase 1.2',
  }));
  ipcMain.handle('inventory:update-product', async () => ({
    success: false,
    message: 'Product updates will be implemented in Phase 1.2',
  }));
  ipcMain.handle('inventory:delete-product', async () => ({
    success: false,
    message: 'Product deletion will be implemented in Phase 1.2',
  }));

  // Order handlers
  ipcMain.handle('order:get-orders', async () => ({
    success: false,
    message: 'Orders will be implemented in Phase 1.2',
  }));
  ipcMain.handle('order:create-order', async () => ({
    success: false,
    message: 'Order creation will be implemented in Phase 1.2',
  }));
  ipcMain.handle('order:update-order', async () => ({
    success: false,
    message: 'Order updates will be implemented in Phase 1.2',
  }));

  // Customer handlers
  ipcMain.handle('customer:get-customers', async () => ({
    success: false,
    message: 'Customers will be implemented in Phase 1.2',
  }));
  ipcMain.handle('customer:create-customer', async () => ({
    success: false,
    message: 'Customer creation will be implemented in Phase 1.2',
  }));
  ipcMain.handle('customer:update-customer', async () => ({
    success: false,
    message: 'Customer updates will be implemented in Phase 1.2',
  }));
  ipcMain.handle('customer:delete-customer', async () => ({
    success: false,
    message: 'Customer deletion will be implemented in Phase 1.2',
  }));

  // Shipping handlers
  ipcMain.handle('shipping:get-shipments', async () => ({
    success: false,
    message: 'Shipping will be implemented in Phase 1.2',
  }));
  ipcMain.handle('shipping:create-shipping', async () => ({
    success: false,
    message: 'Shipping creation will be implemented in Phase 1.2',
  }));
  ipcMain.handle('shipping:track-shipment', async () => ({
    success: false,
    message: 'Shipment tracking will be implemented in Phase 1.2',
  }));

  // Lot Batch handlers
  ipcMain.handle('lot-batch:get-lot-batches', async () => ({
    success: false,
    message: 'Lot batches will be implemented in Phase 1.2',
  }));
  ipcMain.handle('lot-batch:create-lot-batch', async () => ({
    success: false,
    message: 'Lot batch creation will be implemented in Phase 1.2',
  }));
  ipcMain.handle('lot-batch:update-lot-batch', async () => ({
    success: false,
    message: 'Lot batch updates will be implemented in Phase 1.2',
  }));

  console.log('✅ Phase 1.1: Placeholder handlers registered for all domains');
}

/**
 * Initialize database connection and schema
 */
async function initializeDatabase(): Promise<void> {
  const dataDir = join(__dirname, '..', '..', 'data');
  const dbPath = join(dataDir, 'main.db');

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory:', dataDir);
  }

  console.log('📁 Database path:', dbPath);

  // Create database connection (simple approach for Phase 1.1)
  db = new Database(dbPath);

  // Create tables with enhanced schema for CQRS compatibility
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_algorithm TEXT DEFAULT 'PBKDF2',
      password_iterations INTEGER DEFAULT 10000,
      password_created_at INTEGER NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      login_attempts INTEGER DEFAULT 0,
      locked_until INTEGER NULL,
      last_login_at INTEGER NULL,
      agency_id TEXT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT NULL,
      version INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      database_path TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);
    CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);
  `);

  console.log('✅ Database initialized with CQRS-compatible schema');
}

/**
 * Initialize default super admin user if no users exist
 */
async function initializeDefaultSuperAdmin(): Promise<void> {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    if (userCount.count === 0) {
      console.log('👤 No users found, creating default super admin...');

      const defaultUser = {
        id: 'super-admin-001',
        email: 'admin@flowlytix.com',
        password: 'Admin@123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        createdBy: 'system',
      };

      const salt = randomBytes(32).toString('hex');
      const hashedPassword = pbkdf2Sync(defaultUser.password, salt, 10000, 64, 'sha512').toString('hex');
      const now = Date.now();

      db.prepare(
        `
        INSERT INTO users (
          id, email, first_name, last_name, password_hash, password_salt,
          password_algorithm, password_iterations, password_created_at,
          role, status, login_attempts, locked_until, last_login_at,
          agency_id, created_by, created_at, updated_at, updated_by, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        defaultUser.id,
        defaultUser.email,
        defaultUser.firstName,
        defaultUser.lastName,
        hashedPassword,
        salt,
        'PBKDF2',
        10000,
        now,
        defaultUser.role,
        'active',
        0,
        null,
        null,
        null,
        defaultUser.createdBy,
        now,
        now,
        null,
        1
      );

      console.log('✅ Default super admin created successfully');
      console.log('📧 Email:', defaultUser.email);
      console.log('🔑 Password:', defaultUser.password);
      console.log('⚠️  Please change the default password after first login');
    }
  } catch (error) {
    console.error('❌ Failed to initialize default super admin:', error);
  }
}

/**
 * Get database connection (for CQRS handlers)
 */
export function getDatabase(): Database.Database {
  return db;
}

/**
 * Clean up IPC handlers and database connections
 */
export async function cleanupIpcHandlers(): Promise<void> {
  try {
    console.log('🧹 Cleaning up CQRS IPC handlers...');

    // Cleanup CQRS handlers
    if (databaseHandler && databaseHandler.unregisterHandlers) {
      databaseHandler.unregisterHandlers();
    }

    // Close database connection
    if (db) {
      db.close();
      console.log('✅ Database connection closed');
    }

    console.log('✅ CQRS IPC handlers cleaned up');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}
