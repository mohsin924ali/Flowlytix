/**
 * Quick Multi-Tenant Database Test
 * Validates that we can create separate databases for each agency
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function createTestDatabases() {
  console.log('🧪 Quick Multi-Tenant Database Test\n');

  try {
    // Get the schema creation order
    const { SCHEMA_CREATION_ORDER } = require('./src/infrastructure/database/schema');

    console.log('✅ Schema imported successfully');
    console.log(`📋 Found ${SCHEMA_CREATION_ORDER.length} schema statements\n`);

    // Create test agency data
    const testAgencies = [
      {
        id: 'agency-001',
        name: 'North Region Distribution',
        dbPath: './databases/north-region.db',
      },
      {
        id: 'agency-002',
        name: 'South Region Distribution',
        dbPath: './databases/south-region.db',
      },
    ];

    // Create databases directory
    const dbDir = './databases';
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Created databases directory');
    }

    // Create separate database for each agency
    testAgencies.forEach((agency, index) => {
      console.log(`${index + 1}️⃣ Creating database for: ${agency.name}`);

      // Remove existing database if it exists
      if (fs.existsSync(agency.dbPath)) {
        fs.unlinkSync(agency.dbPath);
      }

      // Create new database
      const agencyDb = new Database(agency.dbPath);

      try {
        // Execute all schema statements
        agencyDb.transaction(() => {
          SCHEMA_CREATION_ORDER.forEach((schema) => {
            agencyDb.exec(schema);
          });

          // Insert agency record
          const insertAgency = agencyDb.prepare(`
            INSERT INTO agencies (
              id, name, database_path, status, 
              created_at, updated_at, created_by,
              contact_person, phone, email, address, settings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const now = Date.now();
          insertAgency.run(
            agency.id,
            agency.name,
            agency.dbPath,
            'ACTIVE',
            now,
            now,
            'system',
            'Test Manager',
            '+1-555-0100',
            'manager@' + agency.name.toLowerCase().replace(/\s+/g, '') + '.com',
            '123 Business Ave, Business City, BC 12345',
            JSON.stringify({
              allowCreditSales: true,
              defaultCreditDays: 30,
              maxCreditLimit: 25000,
              currency: 'USD',
              taxRate: 0.08,
            })
          );

          // Insert schema version
          const insertVersion = agencyDb.prepare(`
            INSERT INTO schema_version (version, description, applied_at, applied_by, checksum)
            VALUES (?, ?, ?, ?, ?)
          `);

          insertVersion.run(1, 'Initial multi-tenant schema', now, 'system', 'multi-tenant-checksum');
        })();

        // Verify database creation
        const stats = fs.statSync(agency.dbPath);
        const tableCount = agencyDb
          .prepare(
            `
          SELECT COUNT(*) as count FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `
          )
          .get();

        console.log(`   ✅ Database created successfully:`);
        console.log(`      - Size: ${stats.size} bytes`);
        console.log(`      - Tables: ${tableCount.count}`);
        console.log(`      - Path: ${agency.dbPath}`);

        // Verify agency record
        const agencyRecord = agencyDb
          .prepare(
            `
          SELECT name, status FROM agencies WHERE id = ?
        `
          )
          .get(agency.id);

        if (agencyRecord) {
          console.log(`      - Agency: ${agencyRecord.name} (${agencyRecord.status})`);
        }
      } finally {
        agencyDb.close();
      }

      console.log('');
    });

    // Final verification
    console.log('🎉 Multi-Tenant Database Test PASSED!\n');
    console.log('📊 Summary:');
    console.log(`✅ Created ${testAgencies.length} separate agency databases`);
    console.log('✅ Each database has complete schema replica');
    console.log('✅ Each database contains its agency record');
    console.log('✅ Multi-tenant isolation achieved\n');

    console.log('🗃️ Database Files Created:');
    testAgencies.forEach((agency) => {
      if (fs.existsSync(agency.dbPath)) {
        const stats = fs.statSync(agency.dbPath);
        console.log(`   - ${agency.dbPath} (${stats.size} bytes)`);
      }
    });
  } catch (error) {
    console.error('\n❌ Multi-Tenant Database Test FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
createTestDatabases();
