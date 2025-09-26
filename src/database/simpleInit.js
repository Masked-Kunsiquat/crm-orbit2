// Simple database initialization - bypass complex migrations
import { openDatabase } from 'expo-sqlite';

let db = null;

export function initSimpleDatabase() {
  try {
    console.log('Opening SQLite database...');
    db = openDatabase('crm.db');

    console.log('Database opened successfully');

    // Simple table creation
    db.transaction(tx => {
      // Create basic contacts table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create basic notes table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          contact_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts (id)
        );
      `);

      console.log('Basic database tables created successfully');
    },
    (error) => {
      console.error('Database transaction error:', error);
      throw new Error('Database initialization failed: ' + error.message);
    },
    () => {
      console.log('Database initialization completed successfully');
    });

    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw new Error('Failed to initialize database: ' + error.message);
  }
}

export function getSimpleDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initSimpleDatabase() first.');
  }
  return db;
}