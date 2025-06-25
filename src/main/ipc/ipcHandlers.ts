import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Minimal IPC Handlers for Initial Build
 * This is a simplified version to get the system building
 */

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

  // Auth handlers
  ipcMain.handle('auth:authenticate', handleAuthenticate);
  ipcMain.handle('auth:get-user', handleGetUser);
  ipcMain.handle('auth:list-users', handleListUsers);
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
    console.log('- Credentials:', credentials);
    console.log('- Email:', credentials?.email);
    console.log('- Password:', credentials?.password);
    console.log('- Expected email: admin@flowlytix.com');
    console.log('- Expected password: admin123');

    // Mock authentication for now
    if (credentials?.email === 'admin@flowlytix.com' && credentials?.password === 'admin123') {
      console.log('✅ Authentication successful');
      return {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'admin@flowlytix.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'super_admin',
            permissions: ['VIEW_DASHBOARD', 'MANAGE_PRODUCTS', 'VIEW_REPORTS', 'MANAGE_AGENCIES', 'SWITCH_AGENCIES'],
          },
          token: 'mock-jwt-token',
        },
        timestamp: Date.now(),
      };
    }

    console.log('❌ Authentication failed - invalid credentials');
    return {
      success: false,
      error: 'Invalid credentials',
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

async function handleGetUser(_event: IpcMainInvokeEvent, userId: string): Promise<BasicResponse> {
  try {
    return {
      success: true,
      data: {
        id: userId,
        email: 'admin@flowlytix.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
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

    // TODO: Connect to real database
    // For now, using enhanced mock data with database-like behavior
    // To enable real database:
    // 1. Import DatabaseConnection, SqliteUserRepository
    // 2. Initialize connection: DatabaseConnection.getInstance(defaultDatabaseConfig)
    // 3. Create repository: new SqliteUserRepository(connection)
    // 4. Call repository.search() with proper criteria

    // Enhanced mock user data that simulates real database
    const mockUsers = [
      {
        id: '1',
        email: 'admin@flowlytix.com',
        firstName: 'Admin',
        lastName: 'User',
        fullName: 'Admin User',
        role: 'admin',
        roleName: 'Administrator',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLoginAt: '2024-01-15T10:30:00.000Z',
        isAccountLocked: false,
        loginAttempts: 0,
      },
      {
        id: '2',
        email: 'manager@flowlytix.com',
        firstName: 'John',
        lastName: 'Manager',
        fullName: 'John Manager',
        role: 'manager',
        roleName: 'Manager',
        status: 'active',
        createdAt: '2024-01-02T00:00:00.000Z',
        lastLoginAt: '2024-01-14T15:45:00.000Z',
        isAccountLocked: false,
        loginAttempts: 0,
      },
      {
        id: '3',
        email: 'employee@flowlytix.com',
        firstName: 'Jane',
        lastName: 'Employee',
        fullName: 'Jane Employee',
        role: 'employee',
        roleName: 'Employee',
        status: 'active',
        createdAt: '2024-01-03T00:00:00.000Z',
        lastLoginAt: null,
        isAccountLocked: false,
        loginAttempts: 0,
      },
      {
        id: '4',
        email: 'viewer@flowlytix.com',
        firstName: 'Bob',
        lastName: 'Viewer',
        fullName: 'Bob Viewer',
        role: 'viewer',
        roleName: 'Viewer',
        status: 'inactive',
        createdAt: '2024-01-04T00:00:00.000Z',
        lastLoginAt: '2024-01-10T09:15:00.000Z',
        isAccountLocked: false,
        loginAttempts: 0,
      },
      {
        id: '5',
        email: 'locked@flowlytix.com',
        firstName: 'Locked',
        lastName: 'User',
        fullName: 'Locked User',
        role: 'employee',
        roleName: 'Employee',
        status: 'active',
        createdAt: '2024-01-05T00:00:00.000Z',
        lastLoginAt: '2024-01-12T14:20:00.000Z',
        isAccountLocked: true,
        loginAttempts: 5,
      },
    ];

    // Apply basic filtering (search, role, status)
    let filteredUsers = [...mockUsers];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) => user.fullName.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm)
      );
    }

    if (params.role) {
      filteredUsers = filteredUsers.filter((user) => user.role === params.role);
    }

    if (params.status) {
      filteredUsers = filteredUsers.filter((user) => user.status === params.status);
    }

    if (params.isLocked !== undefined) {
      filteredUsers = filteredUsers.filter((user) => user.isAccountLocked === params.isLocked);
    }

    // Apply pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    console.log('✅ List users successful, returning', paginatedUsers.length, 'users');

    return {
      success: true,
      data: {
        success: true,
        users: paginatedUsers,
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

    // For real agencies, find and update the database
    const agenciesDir = join(process.cwd(), 'data', 'agencies');

    if (!existsSync(agenciesDir)) {
      throw new Error('Agencies directory does not exist');
    }

    // Find the agency database file
    const files = require('fs').readdirSync(agenciesDir);
    const dbFiles = files.filter((file: string) => file.endsWith('.db'));

    let agencyFound = false;
    let updatedAgencyName = updateData.name;

    for (const dbFile of dbFiles) {
      try {
        const dbPath = join(agenciesDir, dbFile);
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);

        // Check if this database contains our agency
        const agencyRecord = db.prepare('SELECT * FROM agencies WHERE id = ?').get(updateData.agencyId);

        if (agencyRecord) {
          agencyFound = true;
          console.log('📊 Found agency in database:', dbFile);

          // Update the agency record
          const updateQuery = db.prepare(`
            UPDATE agencies 
            SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, updated_at = ?
            WHERE id = ?
          `);

          const result = updateQuery.run(
            updateData.name || agencyRecord.name,
            updateData.contactPerson || agencyRecord.contact_person,
            updateData.email || agencyRecord.email,
            updateData.phone || agencyRecord.phone,
            updateData.address || agencyRecord.address,
            Date.now(),
            updateData.agencyId
          );

          db.close();

          if (result.changes > 0) {
            console.log('✅ Agency database updated successfully');
            updatedAgencyName = updateData.name || agencyRecord.name;
            break;
          } else {
            throw new Error('No records were updated');
          }
        } else {
          db.close();
        }
      } catch (dbError) {
        console.warn(
          'Failed to update agency database:',
          dbFile,
          dbError instanceof Error ? dbError.message : 'Unknown error'
        );
      }
    }

    if (!agencyFound) {
      throw new Error('Agency not found in any database');
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
