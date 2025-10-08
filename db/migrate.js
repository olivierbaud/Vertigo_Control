require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/connection');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        // Check if migration already applied
        const result = await pool.query(
          'SELECT filename FROM schema_migrations WHERE filename = $1',
          [file]
        );

        if (result.rows.length > 0) {
          console.log(`⊘ ${file} (already applied)`);
          continue;
        }

        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);

        // Mark as applied
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✓ ${file} completed`);
      }
    }

    console.log('✓ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();