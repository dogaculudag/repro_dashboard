const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { seedDatabase } = require('./seed');

const DB_PATH = path.join(__dirname, '..', 'repro_demo.db');

let db = null;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('Error enabling foreign keys:', err);
          }
        });
      }
    });
  }
  return db;
}

function runQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDatabase() {
  const database = getDb();

  try {
    // Create tables sequentially
    await runQuery(database, `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
        department TEXT CHECK(department IN ('Ön repro', 'Repro', 'Kalite', 'Kolaj')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(database, `
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT UNIQUE NOT NULL,
        customer TEXT NOT NULL,
        siparis_no TEXT,
        sap_no TEXT,
        baski_malz TEXT,
        department TEXT CHECK(department IN ('Ön repro', 'Repro', 'Kalite', 'Kolaj', 'Flexible', 'Tobacco')),
        current_department TEXT NOT NULL CHECK(current_department IN ('Ön repro', 'Repro', 'Kalite', 'Kolaj')),
        current_owner_user_id INTEGER,
        status TEXT NOT NULL DEFAULT 'Waiting' CHECK(status IN ('Waiting', 'InProgress', 'Completed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (current_owner_user_id) REFERENCES users(id)
      )
    `);

    await runQuery(database, `
      CREATE TABLE IF NOT EXISTS work_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        department TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        FOREIGN KEY (file_id) REFERENCES files(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await runQuery(database, `
      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL CHECK(type IN ('Created', 'Taken', 'Transferred', 'Completed', 'Corrected')),
        from_department TEXT,
        to_department TEXT,
        user_id INTEGER NOT NULL,
        note TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    await runQuery(database, `CREATE INDEX IF NOT EXISTS idx_files_current_department ON files(current_department)`);
    await runQuery(database, `CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)`);
    await runQuery(database, `CREATE INDEX IF NOT EXISTS idx_event_logs_file_id ON event_logs(file_id)`);
    await runQuery(database, `CREATE INDEX IF NOT EXISTS idx_work_sessions_file_id ON work_sessions(file_id)`);

    // Check if users exist
    const row = await getQuery(database, `SELECT COUNT(*) as count FROM users`);
    
    // Seed database if empty
    if (row && row.count === 0) {
      await seedDatabase(database);
      console.log('Database initialized and seeded');
    } else {
      console.log('Database already initialized');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = { getDb, initDatabase };

