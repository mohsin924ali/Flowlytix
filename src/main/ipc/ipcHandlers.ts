import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as crypto from 'crypto';

/**
 * IPC Handlers with Database-backed Authentication
 */

// Database setup
const Database = require('better-sqlite3');
const dbPath = join(__dirname, '..', '..', 'data', 'main.db');

// Ensure data directory exists
const dataDir = join(__dirname, '..', '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize main database
let mainDb: any = null;

function initializeMainDatabase() {
  if (!mainDb) {
    mainDb = new Database(dbPath);

    // Create users table if it doesn't exist
    mainDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        status TEXT NOT NULL DEFAULT 'active',
        agency_id TEXT,
        login_attempts INTEGER DEFAULT 0,
        locked_until INTEGER,
        last_login_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create agencies table if it doesn't exist
    mainDb.exec(`
      CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        database_path TEXT NOT NULL UNIQUE,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        settings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Check if any users exist, if not create default super admin
    const userCountStmt = mainDb.prepare('SELECT COUNT(*) as count FROM users');
    const userCount = userCountStmt.get();

    if (userCount.count === 0) {
      console.log('🔧 No users found, creating default super admin...');

      const { hash, salt } = hashPassword('03126073mO');
      const userId = crypto.randomUUID();
      const now = Date.now();

      const insertDefaultUserStmt = mainDb.prepare(`
        INSERT INTO users (
          id, email, first_name, last_name, password_hash, password_salt,
          role, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertDefaultUserStmt.run(
        userId,
        'mohsin@flowlytix.com',
        'Mohsin',
        'Ali',
        hash,
        salt,
        'super_admin',
        'active',
        now,
        now
      );

      console.log('✅ Default super admin created:');
      console.log('   Email: mohsin@flowlytix.com');
      console.log('   Password: 03126073mO');
      console.log('   Role: super_admin');
    }

    console.log('📁 Main database initialized at:', dbPath);
  }
  return mainDb;
}

// Utility functions for password hashing
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: passwordSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// Basic response types
interface BasicResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  console.log('Registering IPC handlers...');

  // Initialize main database
  initializeMainDatabase();

  // Auth handlers
  ipcMain.handle('auth:authenticate', handleAuthenticate);
  ipcMain.handle('auth:get-user', handleGetUser);
  ipcMain.handle('auth:list-users', handleListUsers);
  ipcMain.handle('auth:create-user', handleCreateUser);
  ipcMain.handle('auth:logout', handleLogout);

  // Database handlers
  ipcMain.handle('database:query', handleDatabaseQuery);
  ipcMain.handle('database:execute', handleDatabaseExecute);

  // Analytics handlers
  ipcMain.handle('analytics:sales-summary', handleAnalyticsSalesSummary);
  ipcMain.handle('analytics:sales-trends', handleAnalyticsSalesTrends);
  ipcMain.handle('analytics:customer-segmentation', handleAnalyticsCustomerSegmentation);
  ipcMain.handle('analytics:product-performance', handleAnalyticsProductPerformance);
  ipcMain.handle('analytics:revenue-forecast', handleAnalyticsRevenueForecast);
  ipcMain.handle('analytics:market-basket', handleAnalyticsMarketBasket);
  ipcMain.handle('analytics:customer-ltv', handleAnalyticsCustomerLTV);
  ipcMain.handle('analytics:territory-performance', handleAnalyticsTerritoryPerformance);

  // Product handlers
  ipcMain.handle('product:list', handleProductList);
  ipcMain.handle('product:create', handleProductCreate);
  ipcMain.handle('product:update', handleProductUpdate);
  ipcMain.handle('product:delete', handleProductDelete);

  // Customer handlers
  ipcMain.handle('customer:list', handleCustomerList);
  ipcMain.handle('customer:create', handleCustomerCreate);
  ipcMain.handle('customer:update', handleCustomerUpdate);
  ipcMain.handle('customer:delete', handleCustomerDelete);

  // Order handlers
  ipcMain.handle('order:list', handleOrderList);
  ipcMain.handle('order:create', handleOrderCreate);
  ipcMain.handle('order:update', handleOrderUpdate);

  // Agency handlers - Real database-backed implementation
  ipcMain.handle('agency:list', handleAgencyList);
  ipcMain.handle('agency:create', handleAgencyCreate);
  ipcMain.handle('agency:update-agency', handleAgencyUpdate);

  // Shipping handlers
  ipcMain.handle('shipping:list', handleShippingList);
  ipcMain.handle('shipping:create', handleShippingCreate);
  ipcMain.handle('shipping:track', handleShippingTrack);

  // Lot Batch handlers
  ipcMain.handle('lot-batch:list', handleLotBatchList);
  ipcMain.handle('lot-batch:create', handleLotBatchCreate);
  ipcMain.handle('lot-batch:update', handleLotBatchUpdate);

  console.log('IPC handlers registered successfully');
}

/**
 * Create agency database with complete schema
 */
async function createAgencyDatabase(
  agencyId: string,
  agencyName: string,
  databasePath: string,
  agencyData: any
): Promise<boolean> {
  try {
    // Import database dependencies
    const Database = require('better-sqlite3');

    // Create directory if it doesn't exist
    const agencyDbDir = join(databasePath, '..');
    if (!existsSync(agencyDbDir)) {
      mkdirSync(agencyDbDir, { recursive: true });
      console.log('📁 Created agency database directory:', agencyDbDir);
    }

    // Create new SQLite database for the agency
    const agencyDb = new Database(databasePath);
    console.log('📊 Created agency database file:', databasePath);

    try {
      // Begin transaction for atomic schema creation
      agencyDb.transaction(() => {
        // Create basic schema for agency database
        const basicSchemas = [
          // Schema version table
          `CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at INTEGER NOT NULL,
            applied_by TEXT NOT NULL,
            checksum TEXT NOT NULL
          )`,

          // Agencies table (self-reference)
          `CREATE TABLE IF NOT EXISTS agencies (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE,
            database_path TEXT NOT NULL UNIQUE,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            settings TEXT, -- JSON configuration
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            CONSTRAINT agencies_status_valid CHECK (status IN ('active', 'inactive', 'suspended')),
            CONSTRAINT agencies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
            CONSTRAINT agencies_database_path_format CHECK (database_path LIKE '%.db')
          )`,

          // Users table for agency-specific users
          `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'employee',
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_login_at INTEGER,
            login_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until INTEGER,
            CONSTRAINT users_role_valid CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
            CONSTRAINT users_status_valid CHECK (status IN ('active', 'inactive', 'suspended')),
            CONSTRAINT users_email_not_empty CHECK (LENGTH(TRIM(email)) > 0),
            CONSTRAINT users_name_not_empty CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0)
          )`,

          // Basic indexes
          `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
          `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
          `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
        ];

        // Execute all schema creation statements
        for (const schema of basicSchemas) {
          agencyDb.exec(schema);
        }

        // Insert initial schema version record
        const insertVersion = agencyDb.prepare(`
          INSERT INTO schema_version (version, description, applied_at, applied_by, checksum)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertVersion.run(1, 'Initial agency database schema', Date.now(), 'system', 'initial-schema-checksum');

        // Insert the agency record into its own database
        const insertAgency = agencyDb.prepare(`
          INSERT INTO agencies (
            id, name, database_path, contact_person, phone, email, address,
            settings, status, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const settings = JSON.stringify({
          allowCreditSales: agencyData.allowCreditSales ?? true,
          defaultCreditDays: agencyData.defaultCreditDays ?? 30,
          maxCreditLimit: agencyData.maxCreditLimit ?? 50000,
          requireApprovalForOrders: agencyData.requireApprovalForOrders ?? false,
          enableInventoryTracking: agencyData.enableInventoryTracking ?? true,
          taxRate: agencyData.taxRate ?? 0.15,
          currency: agencyData.currency ?? 'USD',
          businessHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
          },
          notifications: {
            lowStock: true,
            overduePayments: true,
            newOrders: true,
          },
        });

        const now = Date.now();
        insertAgency.run(
          agencyId,
          agencyName,
          databasePath,
          agencyData.contactPerson || null,
          agencyData.phone || null,
          agencyData.email || null,
          agencyData.address || null,
          settings,
          'active',
          now,
          now,
          'system'
        );

        console.log(`✅ Agency database schema created successfully for: ${agencyName}`);
      })();
    } finally {
      // Close the agency database connection
      agencyDb.close();
    }

    // Verify the database was created successfully
    if (!existsSync(databasePath)) {
      throw new Error('Database file was not created successfully');
    }

    console.log(`✅ Agency database initialized successfully:`, {
      agencyId,
      agencyName,
      databasePath,
      databaseSize: require('fs').statSync(databasePath).size,
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to create agency database:', {
      agencyId,
      agencyName,
      databasePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Clean up partial database file if it exists
    if (databasePath && existsSync(databasePath)) {
      try {
        require('fs').unlinkSync(databasePath);
        console.log('🧹 Cleaned up partial database file');
      } catch (cleanupError) {
        console.error('Failed to cleanup partial database file:', cleanupError);
      }
    }

    return false;
  }
}

// Auth handlers
async function handleAuthenticate(_event: IpcMainInvokeEvent, credentials: any): Promise<BasicResponse> {
  try {
    console.log('🔑 Authentication attempt received:');
    console.log('- Email:', credentials?.email);

    // Validate credentials are provided and not empty
    if (!credentials) {
      console.log('❌ Authentication failed - no credentials provided');
      return {
        success: false,
        error: 'Email and password are required',
        timestamp: Date.now(),
      };
    }

    const { email, password } = credentials;

    // Validate email is provided and not empty
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      console.log('❌ Authentication failed - invalid or empty email');
      return {
        success: false,
        error: 'Email is required',
        timestamp: Date.now(),
      };
    }

    // Validate password is provided and not empty
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      console.log('❌ Authentication failed - invalid or empty password');
      return {
        success: false,
        error: 'Password is required',
        timestamp: Date.now(),
      };
    }

    // Initialize database
    const db = initializeMainDatabase();

    // Find user by email
    const findUserStmt = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?');
    const user = findUserStmt.get(email.trim(), 'active');

    if (!user) {
      console.log('❌ Authentication failed - user not found');
      return {
        success: false,
        error: 'Invalid email or password',
        timestamp: Date.now(),
      };
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > Date.now()) {
      console.log('❌ Authentication failed - account locked');
      return {
        success: false,
        error: 'Account is temporarily locked due to too many failed attempts',
        timestamp: Date.now(),
      };
    }

    // Verify password
    const isValidPassword = verifyPassword(password.trim(), user.password_hash, user.password_salt);

    if (!isValidPassword) {
      console.log('❌ Authentication failed - invalid password');

      // Increment login attempts
      const updateAttemptsStmt = db.prepare(`
        UPDATE users 
        SET login_attempts = login_attempts + 1,
            locked_until = CASE WHEN login_attempts + 1 >= 5 THEN ? ELSE locked_until END,
            updated_at = ?
        WHERE id = ?
      `);

      const lockUntil = user.login_attempts + 1 >= 5 ? Date.now() + 15 * 60 * 1000 : null; // 15 minutes
      updateAttemptsStmt.run(lockUntil, Date.now(), user.id);

      return {
        success: false,
        error: 'Invalid email or password',
        timestamp: Date.now(),
      };
    }

    // Check agency status for admin users
    if (user.role === 'admin' && user.agency_id) {
      try {
        // Get agency information from agencies table
        const getAgencyStmt = db.prepare('SELECT status FROM agencies WHERE id = ?');
        const agency = getAgencyStmt.get(user.agency_id);

        if (agency && agency.status !== 'active') {
          console.log('❌ Authentication failed - agency is inactive');
          return {
            success: false,
            error: 'Your agency has been deactivated by the super admin. Please contact support for assistance.',
            timestamp: Date.now(),
          };
        }
      } catch (agencyError) {
        console.error('⚠️ Error checking agency status:', agencyError);
        // Continue with authentication but log the issue
      }
    }

    // Authentication successful - reset login attempts and update last login
    const updateLoginStmt = db.prepare(`
      UPDATE users 
      SET login_attempts = 0, 
          locked_until = NULL, 
          last_login_at = ?, 
          updated_at = ?
      WHERE id = ?
    `);
    updateLoginStmt.run(Date.now(), Date.now(), user.id);

    console.log('✅ Authentication successful for:', email);

    // Map role permissions
    const getPermissions = (role: string) => {
      switch (role) {
        case 'super_admin':
          return [
            'VIEW_DASHBOARD',
            'MANAGE_PRODUCTS',
            'VIEW_REPORTS',
            'MANAGE_AGENCIES',
            'SWITCH_AGENCIES',
            'CREATE_USERS',
            'MANAGE_USERS',
          ];
        case 'admin':
          return ['VIEW_DASHBOARD', 'MANAGE_PRODUCTS', 'VIEW_REPORTS'];
        default:
          return ['VIEW_DASHBOARD'];
      }
    };

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          agencyId: user.agency_id,
          permissions: getPermissions(user.role),
        },
        token: 'jwt-token-placeholder',
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: Date.now(),
    };
  }
}

async function handleCreateUser(_event: IpcMainInvokeEvent, userData: any): Promise<BasicResponse> {
  try {
    console.log('👤 Create user request received');

    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      return {
        success: false,
        error: 'Missing required fields: email, password, firstName, lastName, role',
        timestamp: Date.now(),
      };
    }

    // Initialize database
    const db = initializeMainDatabase();

    // Check if user already exists
    const checkUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkUserStmt.get(userData.email);

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
        timestamp: Date.now(),
      };
    }

    // Hash password
    const { hash, salt } = hashPassword(userData.password);

    // Generate user ID
    const userId = crypto.randomUUID();
    const now = Date.now();

    // Insert new user
    const insertUserStmt = db.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, password_hash, password_salt,
        role, status, agency_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUserStmt.run(
      userId,
      userData.email,
      userData.firstName,
      userData.lastName,
      hash,
      salt,
      userData.role,
      'active',
      userData.agencyId || null,
      now,
      now
    );

    console.log('✅ User created successfully:', userData.email);

    return {
      success: true,
      data: {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        agencyId: userData.agencyId || null,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Create user error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
      timestamp: Date.now(),
    };
  }
}

async function handleGetUser(_event: IpcMainInvokeEvent, userId: string): Promise<BasicResponse> {
  try {
    const db = initializeMainDatabase();

    const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?');
    const user = getUserStmt.get(userId, 'active');

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        agencyId: user.agency_id,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
      timestamp: Date.now(),
    };
  }
}

async function handleListUsers(_event: IpcMainInvokeEvent, params: any): Promise<BasicResponse> {
  try {
    console.log('👥 List users request received:', params);

    // Initialize database
    const db = initializeMainDatabase();

    // Build dynamic query based on filters
    let query = `
      SELECT 
        id, email, first_name, last_name, role, status, agency_id,
        login_attempts, locked_until, last_login_at, created_at, updated_at
      FROM users 
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    // Apply search filter
    if (params?.search) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${params.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Apply role filter
    if (params?.role) {
      query += ` AND role = ?`;
      queryParams.push(params.role);
    }

    // Apply status filter
    if (params?.status) {
      query += ` AND status = ?`;
      queryParams.push(params.status);
    }

    // Apply locked filter
    if (params?.isLocked !== undefined) {
      if (params.isLocked) {
        query += ` AND locked_until > ?`;
        queryParams.push(Date.now());
      } else {
        query += ` AND (locked_until IS NULL OR locked_until <= ?)`;
        queryParams.push(Date.now());
      }
    }

    // Apply pagination
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Execute query
    const usersStmt = db.prepare(query);
    const users = usersStmt.all(...queryParams);

    // Get total count for pagination
    const countQuery = query
      .replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM')
      .replace(/ORDER BY.*?LIMIT.*?OFFSET.*?$/, '');
    const countParams = queryParams.slice(0, -2); // Remove LIMIT and OFFSET params
    const countStmt = db.prepare(countQuery);
    const totalResult = countStmt.get(...countParams) as { count: number };
    const total = totalResult.count;

    // Get agency information for users who have agency_id
    const agencyIds = [...new Set(users.filter((user: any) => user.agency_id).map((user: any) => user.agency_id))];
    const agencies: Record<string, string> = {};

    if (agencyIds.length > 0) {
      const agencyQuery = `SELECT id, name FROM agencies WHERE id IN (${agencyIds.map(() => '?').join(',')})`;
      const agencyStmt = db.prepare(agencyQuery);
      const agencyResults = agencyStmt.all(...agencyIds);

      agencyResults.forEach((agency: any) => {
        agencies[agency.id] = agency.name;
      });
    }

    // Map users to expected format
    const mappedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      roleName: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' '),
      status: user.status,
      agencyId: user.agency_id,
      agencyName: user.agency_id ? agencies[user.agency_id] || 'Unknown Agency' : undefined,
      createdAt: new Date(user.created_at).toISOString(),
      lastLoginAt: user.last_login_at ? new Date(user.last_login_at).toISOString() : null,
      isAccountLocked: user.locked_until ? user.locked_until > Date.now() : false,
      loginAttempts: user.login_attempts,
    }));

    const hasMore = offset + limit < total;

    console.log('✅ List users successful, returning', mappedUsers.length, 'users');

    return {
      success: true,
      data: {
        success: true,
        users: mappedUsers,
        total,
        limit,
        offset,
        hasMore,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ List users error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list users',
      timestamp: Date.now(),
    };
  }
}

async function handleLogout(_event: IpcMainInvokeEvent): Promise<BasicResponse> {
  return {
    success: true,
    timestamp: Date.now(),
  };
}

// Database handlers
async function handleDatabaseQuery(_event: IpcMainInvokeEvent, sql: string, params?: any[]): Promise<BasicResponse> {
  try {
    console.log('Database query:', sql, params);
    return {
      success: true,
      data: { rows: [], rowCount: 0 },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database query failed',
      timestamp: Date.now(),
    };
  }
}

async function handleDatabaseExecute(_event: IpcMainInvokeEvent, sql: string, params?: any[]): Promise<BasicResponse> {
  try {
    console.log('Database execute:', sql, params);
    return {
      success: true,
      data: { changes: 0, lastInsertRowid: 0 },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database execute failed',
      timestamp: Date.now(),
    };
  }
}

// Analytics handlers
async function handleAnalyticsSalesSummary(_event: IpcMainInvokeEvent, _request: any): Promise<BasicResponse> {
  try {
    return {
      success: true,
      data: {
        summary: {
          totalSales: 150000,
          salesCurrency: 'USD',
          totalOrders: 245,
          averageOrderValue: 612.24,
          uniqueCustomers: 89,
          totalUnits: 1230,
          period: {
            type: 'LAST_30_DAYS',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        },
        timeSeries: [],
        topProducts: [],
        topCustomers: [],
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analytics failed',
      timestamp: Date.now(),
    };
  }
}

async function handleAnalyticsSalesTrends(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { trends: [] }, timestamp: Date.now() };
}

async function handleAnalyticsCustomerSegmentation(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { segments: [], totalCustomers: 0, segmentationModel: 'RFM' }, timestamp: Date.now() };
}

async function handleAnalyticsProductPerformance(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { products: [], analysisType: 'SALES', totalProducts: 0 }, timestamp: Date.now() };
}

async function handleAnalyticsRevenueForecast(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { forecast: [] }, timestamp: Date.now() };
}

async function handleAnalyticsMarketBasket(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { rules: [], totalRules: 0, averageConfidence: 0 }, timestamp: Date.now() };
}

async function handleAnalyticsCustomerLTV(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return { success: true, data: { customers: [], averageLTV: 0, totalCustomers: 0 }, timestamp: Date.now() };
}

async function handleAnalyticsTerritoryPerformance(_event: IpcMainInvokeEvent, request: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { territories: [], territoryType: 'REGION', totalTerritories: 0 },
    timestamp: Date.now(),
  };
}

// Product handlers
async function handleProductList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      products: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    },
    timestamp: Date.now(),
  };
}

async function handleProductCreate(_event: IpcMainInvokeEvent, productData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: 'new-product-id' },
    timestamp: Date.now(),
  };
}

async function handleProductUpdate(
  _event: IpcMainInvokeEvent,
  productId: string,
  updateData: any
): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: productId },
    timestamp: Date.now(),
  };
}

async function handleProductDelete(_event: IpcMainInvokeEvent, productId: string): Promise<BasicResponse> {
  return {
    success: true,
    timestamp: Date.now(),
  };
}

// Customer handlers
async function handleCustomerList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      customers: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    },
    timestamp: Date.now(),
  };
}

async function handleCustomerCreate(_event: IpcMainInvokeEvent, customerData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: 'new-customer-id' },
    timestamp: Date.now(),
  };
}

async function handleCustomerUpdate(
  _event: IpcMainInvokeEvent,
  customerId: string,
  updateData: any
): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: customerId },
    timestamp: Date.now(),
  };
}

async function handleCustomerDelete(_event: IpcMainInvokeEvent, customerId: string): Promise<BasicResponse> {
  return {
    success: true,
    timestamp: Date.now(),
  };
}

// Order handlers
async function handleOrderList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      orders: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    },
    timestamp: Date.now(),
  };
}

async function handleOrderCreate(_event: IpcMainInvokeEvent, orderData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: 'new-order-id' },
    timestamp: Date.now(),
  };
}

async function handleOrderUpdate(_event: IpcMainInvokeEvent, orderId: string, updateData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: orderId },
    timestamp: Date.now(),
  };
}

// Agency handlers - Real database-backed implementation
async function handleAgencyList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  try {
    console.log('🏢 Agency list request received:', filters);

    // Get list of agency database files from the agencies directory
    const agenciesDir = join(process.cwd(), 'data', 'agencies');
    let agencies = [];

    try {
      // Check if agencies directory exists
      if (existsSync(agenciesDir)) {
        const files = require('fs').readdirSync(agenciesDir);
        const dbFiles = files.filter((file: string) => file.endsWith('.db'));

        console.log('📁 Found', dbFiles.length, 'agency database files');

        // Read agency data from each database file
        for (const dbFile of dbFiles) {
          try {
            const dbPath = join(agenciesDir, dbFile);
            const Database = require('better-sqlite3');
            const db = new Database(dbPath, { readonly: true });

            // Get agency record from its own database
            const agencyRecord = db.prepare('SELECT * FROM agencies LIMIT 1').get();

            if (agencyRecord) {
              // Parse settings JSON
              let settings = {};
              try {
                settings = JSON.parse(agencyRecord.settings || '{}');
              } catch (e) {
                console.warn('Failed to parse settings for agency:', agencyRecord.id);
                settings = {};
              }

              agencies.push({
                id: agencyRecord.id,
                name: agencyRecord.name,
                databasePath: agencyRecord.database_path,
                contactPerson: agencyRecord.contact_person,
                phone: agencyRecord.phone,
                email: agencyRecord.email,
                address: agencyRecord.address,
                status: agencyRecord.status,
                createdAt: new Date(agencyRecord.created_at).toISOString(),
                settings: settings,
              });
            }

            db.close();
          } catch (dbError) {
            console.warn(
              'Failed to read agency database:',
              dbFile,
              dbError instanceof Error ? dbError.message : 'Unknown error'
            );
          }
        }
      } else {
        console.log('📁 Agencies directory does not exist yet');
      }
    } catch (dirError) {
      console.warn(
        'Failed to read agencies directory:',
        dirError instanceof Error ? dirError.message : 'Unknown error'
      );
    }

    // If no real agencies found, return mock data for development
    if (agencies.length === 0) {
      console.log('📋 No real agencies found, returning mock data');
      agencies = [
        {
          id: 'agency-demo-1',
          name: 'Downtown Distribution (Demo)',
          databasePath: 'data/agencies/downtown-distribution.db',
          contactPerson: 'John Smith',
          phone: '+1-555-0123',
          email: 'john@downtown-dist.com',
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
          settings: {
            allowCreditSales: true,
            defaultCreditDays: 30,
            maxCreditLimit: 50000,
            currency: 'USD',
          },
        },
        {
          id: 'agency-demo-2',
          name: 'Northside Goods (Demo)',
          databasePath: 'data/agencies/northside-goods.db',
          contactPerson: 'Sarah Johnson',
          phone: '+1-555-0456',
          email: 'sarah@northside.com',
          status: 'active',
          createdAt: '2024-01-02T00:00:00.000Z',
          settings: {
            allowCreditSales: true,
            defaultCreditDays: 15,
            maxCreditLimit: 25000,
            currency: 'USD',
          },
        },
      ];
    }

    console.log('✅ Agency list successful, returning', agencies.length, 'agencies');
    return {
      success: true,
      data: {
        agencies: agencies,
        totalCount: agencies.length,
        page: 1,
        pageSize: 50,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Agency list error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch agencies',
      timestamp: Date.now(),
    };
  }
}

async function handleAgencyCreate(_event: IpcMainInvokeEvent, agencyData: any): Promise<BasicResponse> {
  try {
    console.log('🏢 Agency creation request received:', {
      name: agencyData?.name,
      contactPerson: agencyData?.contactPerson,
      email: agencyData?.email,
    });

    // Validate required fields
    if (!agencyData?.name || typeof agencyData.name !== 'string') {
      throw new Error('Agency name is required');
    }

    // Generate unique ID and database path
    const agencyId = `agency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sanitizedName = agencyData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const databasePath = join(process.cwd(), 'data', 'agencies', `${sanitizedName}-${agencyId.split('-')[1]}.db`);

    console.log('📊 Creating agency database:', {
      agencyId,
      name: agencyData.name,
      databasePath,
    });

    // Create agency database with proper schema
    const success = await createAgencyDatabase(agencyId, agencyData.name, databasePath, agencyData);

    if (!success) {
      throw new Error('Failed to create agency database');
    }

    const responseData = {
      agencyId,
      name: agencyData.name,
      databasePath,
      isOperational: true,
      message: 'Agency created successfully with dedicated database',
    };

    console.log('✅ Agency creation successful:', responseData);
    return {
      success: true,
      data: responseData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Agency creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create agency',
      timestamp: Date.now(),
    };
  }
}

async function handleAgencyUpdate(_event: IpcMainInvokeEvent, updateData: any): Promise<BasicResponse> {
  try {
    console.log('🏢 Agency update request received:', {
      agencyId: updateData?.agencyId,
      name: updateData?.name,
      contactPerson: updateData?.contactPerson,
      email: updateData?.email,
    });

    // Validate required fields
    if (!updateData?.agencyId || typeof updateData.agencyId !== 'string') {
      throw new Error('Agency ID is required');
    }

    // For mock agencies, we'll handle them differently
    if (updateData.agencyId.startsWith('agency-demo-')) {
      console.log('📝 Updating mock agency data (demo mode)');
      const responseData = {
        agencyId: updateData.agencyId,
        agencyName: updateData.name || 'Updated Agency',
        isOperational: true,
        message: 'Demo agency updated successfully (changes are temporary)',
      };

      console.log('✅ Mock agency update successful:', responseData);
      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
      };
    }

    // Update agency in main database
    const db = initializeMainDatabase();

    // Check if agency exists in main database
    const agencyRecord = db.prepare('SELECT * FROM agencies WHERE id = ?').get(updateData.agencyId);

    if (!agencyRecord) {
      throw new Error('Agency not found in main database');
    }

    console.log('📊 Found agency in main database:', agencyRecord.name);

    // Update the agency record in main database
    const updateQuery = db.prepare(`
      UPDATE agencies 
      SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = updateQuery.run(
      updateData.name || agencyRecord.name,
      updateData.contactPerson || agencyRecord.contact_person,
      updateData.email || agencyRecord.email,
      updateData.phone || agencyRecord.phone,
      updateData.address || agencyRecord.address,
      updateData.status || agencyRecord.status,
      Date.now(),
      updateData.agencyId
    );

    if (result.changes === 0) {
      throw new Error('No records were updated in main database');
    }

    console.log('✅ Main database updated successfully');
    const updatedAgencyName = updateData.name || agencyRecord.name;

    // Also update the agency's own database if it exists
    const agenciesDir = join(process.cwd(), 'data', 'agencies');
    if (existsSync(agenciesDir)) {
      const files = require('fs').readdirSync(agenciesDir);
      const dbFiles = files.filter((file: string) => file.endsWith('.db'));

      for (const dbFile of dbFiles) {
        try {
          const dbPath = join(agenciesDir, dbFile);
          const Database = require('better-sqlite3');
          const agencyDb = new Database(dbPath);

          // Check if this database contains our agency
          const agencyInOwnDb = agencyDb.prepare('SELECT * FROM agencies WHERE id = ?').get(updateData.agencyId);

          if (agencyInOwnDb) {
            console.log('📊 Updating agency in its own database:', dbFile);

            // Update the agency record in its own database
            const updateOwnDbQuery = agencyDb.prepare(`
              UPDATE agencies 
              SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = ?
              WHERE id = ?
            `);

            updateOwnDbQuery.run(
              updateData.name || agencyInOwnDb.name,
              updateData.contactPerson || agencyInOwnDb.contact_person,
              updateData.email || agencyInOwnDb.email,
              updateData.phone || agencyInOwnDb.phone,
              updateData.address || agencyInOwnDb.address,
              updateData.status || agencyInOwnDb.status,
              Date.now(),
              updateData.agencyId
            );

            console.log('✅ Agency own database updated successfully');
          }

          agencyDb.close();
        } catch (dbError) {
          console.warn(
            'Failed to update agency own database:',
            dbFile,
            dbError instanceof Error ? dbError.message : 'Unknown error'
          );
        }
      }
    }

    const responseData = {
      agencyId: updateData.agencyId,
      agencyName: updatedAgencyName,
      isOperational: true,
      message: 'Agency updated successfully in database',
    };

    console.log('✅ Agency update successful:', responseData);
    return {
      success: true,
      data: responseData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Agency update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update agency',
      timestamp: Date.now(),
    };
  }
}

// Shipping handlers
async function handleShippingList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      shipments: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    },
    timestamp: Date.now(),
  };
}

async function handleShippingCreate(_event: IpcMainInvokeEvent, shippingData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: 'new-shipping-id', trackingNumber: 'TRK123456789' },
    timestamp: Date.now(),
  };
}

async function handleShippingTrack(_event: IpcMainInvokeEvent, trackingNumber: string): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      trackingNumber,
      status: 'IN_TRANSIT',
      updates: [],
    },
    timestamp: Date.now(),
  };
}

// Lot Batch handlers
async function handleLotBatchList(_event: IpcMainInvokeEvent, filters?: any): Promise<BasicResponse> {
  return {
    success: true,
    data: {
      lotBatches: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    },
    timestamp: Date.now(),
  };
}

async function handleLotBatchCreate(_event: IpcMainInvokeEvent, lotBatchData: any): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: 'new-lot-batch-id' },
    timestamp: Date.now(),
  };
}

async function handleLotBatchUpdate(
  _event: IpcMainInvokeEvent,
  lotBatchId: string,
  updateData: any
): Promise<BasicResponse> {
  return {
    success: true,
    data: { id: lotBatchId },
    timestamp: Date.now(),
  };
}
