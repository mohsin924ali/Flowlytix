/**
 * Demo User Setup Script
 * Creates an admin user for testing the multi-tenant system
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Create demo user data
const demoUser = {
  id: uuidv4(),
  email: 'admin@flowlytix.com',
  firstName: 'Admin',
  lastName: 'User',
  password: 'admin123', // Will be hashed
  role: 'admin',
  status: 'active',
};

// Hash password function (simplified for demo)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

async function setupDemoUser() {
  try {
    // Connect to main database
    const db = new Database('./main.db');

    // Create users table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2',
        password_iterations INTEGER NOT NULL DEFAULT 100000,
        password_created_at INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        status TEXT NOT NULL DEFAULT 'active',
        login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NULL,
        last_login_at INTEGER NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        created_by TEXT NULL,
        updated_by TEXT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Hash the password
    const { hash, salt } = hashPassword(demoUser.password);
    const now = Date.now();

    // Insert demo user
    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (
        id, email, first_name, last_name, password_hash, password_salt,
        password_algorithm, password_iterations, password_created_at,
        role, status, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      demoUser.id,
      demoUser.email,
      demoUser.firstName,
      demoUser.lastName,
      hash,
      salt,
      'PBKDF2',
      100000,
      now,
      demoUser.role,
      demoUser.status,
      now,
      now,
      1
    );

    console.log('✅ Demo user created successfully!');
    console.log(`📧 Email: ${demoUser.email}`);
    console.log(`🔑 Password: ${demoUser.password}`);
    console.log(`👤 Role: ${demoUser.role}`);
    console.log(`🆔 ID: ${demoUser.id}`);

    db.close();
  } catch (error) {
    console.error('❌ Failed to setup demo user:', error);
  }
}

// Run the setup
setupDemoUser();
