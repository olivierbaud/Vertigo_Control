/**
 * Admin Routes - System administration endpoints
 *
 * IMPORTANT: These routes should be protected and only accessible to administrators
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/admin/run-migrations
 * Manually trigger database migrations
 *
 * This is useful when migrations fail during deployment
 */
router.post('/run-migrations', async (req, res) => {
  try {
    const { integrator_id, role } = req.user;

    // Only allow admins (you can add admin role checking here)
    // For now, any authenticated user can run this
    // TODO: Add proper admin role checking

    console.log(`[MIGRATION] Starting migrations requested by user ${integrator_id}...`);

    const results = {
      success: true,
      migrationsRun: [],
      migrationsSkipped: [],
      errors: []
    };

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, '../../db/migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        try {
          // Check if migration already applied
          const result = await pool.query(
            'SELECT filename FROM schema_migrations WHERE filename = $1',
            [file]
          );

          if (result.rows.length > 0) {
            console.log(`[MIGRATION] ⊘ ${file} (already applied)`);
            results.migrationsSkipped.push(file);
            continue;
          }

          console.log(`[MIGRATION] Running migration: ${file}`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

          // Execute migration in a transaction
          await pool.query('BEGIN');
          await pool.query(sql);

          // Mark as applied
          await pool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          );

          await pool.query('COMMIT');

          console.log(`[MIGRATION] ✓ ${file} completed`);
          results.migrationsRun.push(file);

        } catch (error) {
          await pool.query('ROLLBACK');
          console.error(`[MIGRATION] ✗ ${file} failed:`, error.message);
          results.errors.push({
            file,
            error: error.message,
            detail: error.detail || null
          });
        }
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(`[MIGRATION] Completed. Run: ${results.migrationsRun.length}, Skipped: ${results.migrationsSkipped.length}, Errors: ${results.errors.length}`);

    res.json({
      message: results.success ? 'Migrations completed successfully' : 'Some migrations failed',
      ...results
    });

  } catch (error) {
    console.error('[MIGRATION] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration system error',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/migration-status
 * Check which migrations have been applied
 */
router.get('/migration-status', async (req, res) => {
  try {
    // Check if migrations table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'schema_migrations'
      )
    `);

    if (!tableExists.rows[0].exists) {
      return res.json({
        initialized: false,
        message: 'Migrations table does not exist. Run migrations first.',
        appliedMigrations: []
      });
    }

    // Get applied migrations
    const result = await pool.query(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at'
    );

    // Get available migrations
    const migrationsDir = path.join(__dirname, '../../db/migrations');
    const availableFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const appliedFiles = result.rows.map(r => r.filename);
    const pendingFiles = availableFiles.filter(f => !appliedFiles.includes(f));

    res.json({
      initialized: true,
      appliedMigrations: result.rows,
      pendingMigrations: pendingFiles,
      totalApplied: appliedFiles.length,
      totalPending: pendingFiles.length,
      totalAvailable: availableFiles.length
    });

  } catch (error) {
    console.error('[MIGRATION] Status check error:', error);
    res.status(500).json({
      error: 'Failed to check migration status',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/db-info
 * Get basic database information
 */
router.get('/db-info', async (req, res) => {
  try {
    // Get database version
    const versionResult = await pool.query('SELECT version()');

    // Get table count
    const tableResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    // Get specific driver-related tables
    const driverTablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%driver%'
      ORDER BY table_name
    `);

    // Get columns for device_drivers table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'device_drivers'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // Test the listDrivers query
    let queryTestResult = null;
    try {
      const testQuery = await pool.query(`
        SELECT d.*,
               COUNT(DISTINCT dd.controller_id) as deployment_count
        FROM device_drivers d
        LEFT JOIN driver_deployments dd ON d.id = dd.driver_id AND dd.deployment_status = 'active'
        WHERE d.integrator_id = $1
        GROUP BY d.id ORDER BY d.created_at DESC
        LIMIT 10
      `, [req.user.integrator_id]);
      queryTestResult = {
        success: true,
        rowCount: testQuery.rows.length
      };
    } catch (queryError) {
      queryTestResult = {
        success: false,
        error: queryError.message,
        detail: queryError.detail,
        hint: queryError.hint
      };
    }

    res.json({
      databaseVersion: versionResult.rows[0].version,
      totalTables: parseInt(tableResult.rows[0].count),
      driverTables: driverTablesResult.rows.map(r => r.table_name),
      deviceDriversColumns: columnsResult.rows,
      listDriversQueryTest: queryTestResult,
      connectionStatus: 'connected'
    });

  } catch (error) {
    console.error('[DB-INFO] Error:', error);
    res.status(500).json({
      error: 'Failed to get database info',
      message: error.message,
      connectionStatus: 'error'
    });
  }
});

module.exports = router;
