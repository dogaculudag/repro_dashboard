const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'repro_demo.db');

function migrateDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if old columns exist
      db.all("PRAGMA table_info(files)", [], (err, columns) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        const columnNames = columns.map(col => col.name);
        const hasOldColumns = columnNames.includes('customer_no') || columnNames.includes('silindir_boyu');
        const hasNewColumns = columnNames.includes('customer') && columnNames.includes('siparis_no');

        if (hasNewColumns) {
          // Check if department constraint needs updating
          // SQLite doesn't allow altering CHECK constraints, but we can check if Flexible/Tobacco exist
          // For now, we'll just log that migration is done
          // If constraint update is needed, user should recreate database or we'd need to recreate table
          console.log('Database already migrated (column structure)');
          console.log('Note: If you need to add Flexible/Tobacco to department, recreate the database');
          db.close();
          resolve();
          return;
        }

        if (hasOldColumns) {
          console.log('Migrating database...');
          
          // Create new table with new structure
          db.run(`
            CREATE TABLE IF NOT EXISTS files_new (
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
          `, (err) => {
            if (err) {
              console.error('Error creating new table:', err);
              db.close();
              reject(err);
              return;
            }

            // Migrate data
            db.run(`
              INSERT INTO files_new (
                id, file_id, customer, siparis_no, sap_no, baski_malz, department,
                current_department, current_owner_user_id, status,
                created_at, updated_at, completed_at
              )
              SELECT 
                id, file_id, 
                COALESCE(customer_no, 'Bilinmeyen') as customer,
                NULL as siparis_no,
                NULL as sap_no,
                NULL as baski_malz,
                'Ön repro' as department,
                current_department, current_owner_user_id, status,
                created_at, updated_at, completed_at
              FROM files
            `, (err) => {
              if (err) {
                console.error('Error migrating data:', err);
                db.close();
                reject(err);
                return;
              }

              // Drop old table
              db.run('DROP TABLE files', (err) => {
                if (err) {
                  console.error('Error dropping old table:', err);
                  db.close();
                  reject(err);
                  return;
                }

                // Rename new table
                db.run('ALTER TABLE files_new RENAME TO files', (err) => {
                  if (err) {
                    console.error('Error renaming table:', err);
                    db.close();
                    reject(err);
                    return;
                  }

                  console.log('Migration completed successfully');
                  db.close();
                  resolve();
                });
              });
            });
          });
        } else {
          console.log('No migration needed');
          db.close();
          resolve();
        }
      });
    });
  });
}

if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Migration done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };

