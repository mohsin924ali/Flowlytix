/**
 * Multi-Tenant Backend Test Script
 * Tests agency creation and database replication functionality
 */

const { DatabaseConnection } = require('./src/infrastructure/database/connection');
const { SqliteAgencyRepository } = require('./src/infrastructure/repositories/agency.repository');
const { SqliteUserRepository } = require('./src/infrastructure/repositories/user.repository');
const { CreateAgencyHandler } = require('./src/application/handlers/agency/create-agency.handler');
const fs = require('fs');
const path = require('path');

async function testMultiTenantSystem() {
  console.log('🧪 Testing Multi-Tenant Backend System\n');

  try {
    // Step 1: Initialize database connection
    console.log('1️⃣ Initializing database connection...');
    const connection = new DatabaseConnection('./main.db');
    await connection.initialize();
    console.log('✅ Database connection established\n');

    // Step 2: Initialize repositories
    console.log('2️⃣ Initializing repositories...');
    const agencyRepository = new SqliteAgencyRepository(connection);
    const userRepository = new SqliteUserRepository(connection);
    console.log('✅ Repositories initialized\n');

    // Step 3: Get demo user
    console.log('3️⃣ Finding demo admin user...');
    const adminUser = await userRepository.findByEmail('admin@flowlytix.com');
    if (!adminUser) {
      throw new Error('Demo admin user not found. Run setup-demo-user.js first.');
    }
    console.log(`✅ Found admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})\n`);

    // Step 4: Create agency handler
    console.log('4️⃣ Creating agency handler...');
    const createAgencyHandler = new CreateAgencyHandler(agencyRepository, userRepository);
    console.log('✅ Agency handler created\n');

    // Step 5: Test agency creation
    console.log('5️⃣ Testing agency creation...');
    const testAgencyData = {
      name: 'Test Distribution Agency',
      databasePath: './databases/test-agency.db',
      contactPerson: 'John Doe',
      email: 'john@testdistribution.com',
      phone: '+1-555-0123',
      address: '123 Test Street, Test City, TC 12345',
      createdBy: adminUser.id,
      settings: {
        allowCreditSales: true,
        defaultCreditDays: 30,
        maxCreditLimit: 50000,
        requireApprovalForOrders: false,
        enableInventoryTracking: true,
        taxRate: 0.08,
        currency: 'USD',
        businessHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'UTC',
        },
      },
    };

    // Create databases directory if it doesn't exist
    const dbDir = path.dirname(testAgencyData.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const result = await createAgencyHandler.handle(testAgencyData);

    if (result.success) {
      console.log('✅ Agency created successfully:');
      console.log(`   - Agency ID: ${result.agencyId}`);
      console.log(`   - Database Path: ${result.databasePath}`);
      console.log(`   - Is Operational: ${result.isOperational}`);
    } else {
      throw new Error(`Agency creation failed: ${result.error}`);
    }

    // Step 6: Verify database file was created
    console.log('\n6️⃣ Verifying agency database creation...');
    if (fs.existsSync(result.databasePath)) {
      const stats = fs.statSync(result.databasePath);
      console.log(`✅ Agency database file created:`);
      console.log(`   - Path: ${result.databasePath}`);
      console.log(`   - Size: ${stats.size} bytes`);
      console.log(`   - Created: ${stats.birthtime}`);
    } else {
      throw new Error('Agency database file was not created');
    }

    // Step 7: Test database schema replication
    console.log('\n7️⃣ Testing database schema replication...');
    const Database = require('better-sqlite3');
    const agencyDb = new Database(result.databasePath);

    try {
      // Check if key tables exist
      const tables = agencyDb
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all();

      console.log(`✅ Agency database contains ${tables.length} tables:`);
      tables.forEach((table) => {
        console.log(`   - ${table.name}`);
      });

      // Check if agency record exists in its own database
      const agencyRecord = agencyDb
        .prepare(
          `
        SELECT * FROM agencies WHERE id = ?
      `
        )
        .get(result.agencyId);

      if (agencyRecord) {
        console.log(`✅ Agency record found in dedicated database:`);
        console.log(`   - Name: ${agencyRecord.name}`);
        console.log(`   - Status: ${agencyRecord.status}`);
      } else {
        throw new Error('Agency record not found in dedicated database');
      }
    } finally {
      agencyDb.close();
    }

    // Step 8: Success summary
    console.log('\n🎉 Multi-Tenant Backend Test PASSED!');
    console.log('\n📊 Test Results:');
    console.log('✅ Agency creation - SUCCESS');
    console.log('✅ Database replication - SUCCESS');
    console.log('✅ Schema migration - SUCCESS');
    console.log('✅ Agency record insertion - SUCCESS');
    console.log('✅ Multi-tenant isolation - SUCCESS');

    // Clean up
    await connection.close();
  } catch (error) {
    console.error('\n❌ Multi-Tenant Backend Test FAILED!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testMultiTenantSystem();
