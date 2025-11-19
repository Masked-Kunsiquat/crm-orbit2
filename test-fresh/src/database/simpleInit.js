// Simple database initialization - bypass complex migrations
import { openDatabase } from 'expo-sqlite';

let db = null;

export async function initSimpleDatabase() {
  try {
    console.log('Opening SQLite database...');
    db = openDatabase('crm.db');

    console.log('Database opened successfully');

    // Wrap transaction in a Promise so callers can await completion
    await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Create basic contacts table
          tx.executeSql(
            `
            CREATE TABLE IF NOT EXISTS contacts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              first_name TEXT,
              last_name TEXT,
              email TEXT,
              phone TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `,
            [],
            undefined,
            (_tx, err) => {
              console.error('SQL error creating contacts table:', err);
              // Returning true signals to abort/rollback the transaction
              return true;
            }
          );

          // Create basic notes table
          tx.executeSql(
            `
            CREATE TABLE IF NOT EXISTS notes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              content TEXT NOT NULL,
              contact_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (contact_id) REFERENCES contacts (id)
            );
          `,
            [],
            undefined,
            (_tx, err) => {
              console.error('SQL error creating notes table:', err);
              return true;
            }
          );
        },
        error => {
          console.error('Database transaction error:', error);
          reject(error);
        },
        () => {
          console.log('Database initialization completed successfully');
          resolve();
        }
      );
    });

    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw new Error('Failed to initialize database: ' + error.message);
  }
}

export function getSimpleDatabase() {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initSimpleDatabase() first.'
    );
  }
  return db;
}
