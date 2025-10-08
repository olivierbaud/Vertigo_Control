const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const fileManager = require('../ai/file-manager');
const pool = require('../db/connection');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * GET /api/controllers/:controllerId/gui/status
 * Get GUI file status (draft vs deployed vs live)
 */
router.get('/status', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const status = await fileManager.getStatus(controllerId);

    res.json({ status });

  } catch (error) {
    console.error('Get GUI status error:', error);
    res.status(500).json({ error: 'Failed to get GUI status' });
  }
});

/**
 * GET /api/controllers/:controllerId/gui/files/draft
 * Get all draft files (for preview)
 */
router.get('/files/draft', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const draftFiles = await fileManager.readDraftFiles(controllerId);

    res.json({ files: draftFiles });

  } catch (error) {
    console.error('Get draft files error:', error);
    res.status(500).json({ error: 'Failed to get draft files' });
  }
});

/**
 * POST /api/controllers/:controllerId/gui/deploy
 * Deploy draft files to deployed state (creates version snapshot)
 */
router.post('/deploy', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { commitMessage } = req.body;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const result = await fileManager.deployDraftFiles(
      controllerId,
      integrator_id,
      commitMessage
    );

    res.json({
      message: 'Files deployed successfully',
      version: result.version,
      filesDeployed: result.filesDeployed,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('Deploy error:', error);

    if (error.message.includes('No draft files')) {
      return res.status(400).json({
        error: 'No draft files to deploy',
        message: error.message
      });
    }

    res.status(500).json({ error: 'Deployment failed' });
  }
});

/**
 * POST /api/controllers/:controllerId/gui/sync
 * Sync deployed files to NUC via WebSocket
 */
router.post('/sync', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    // Get deployed files
    const deployedFiles = await fileManager.readDeployedFiles(controllerId);

    if (Object.keys(deployedFiles).length === 0) {
      return res.status(400).json({
        error: 'No deployed files to sync',
        message: 'Deploy files first before syncing'
      });
    }

    // Get deployed version
    const versionResult = await pool.query(
      `SELECT MAX(version_number) as version
       FROM gui_file_versions
       WHERE controller_id = $1 AND state = 'deployed'`,
      [controllerId]
    );

    const version = versionResult.rows[0].version;

    // Generate sync ID
    const syncId = uuidv4();

    // Send sync command via WebSocket
    const wsServer = req.app.get('wsServer');
    if (!wsServer) {
      return res.status(500).json({ error: 'WebSocket server not available' });
    }

    const sent = await wsServer.syncGUI(controllerId, syncId, version, deployedFiles);

    if (sent) {
      res.json({
        message: 'Sync initiated',
        syncId,
        version,
        fileCount: Object.keys(deployedFiles).length
      });
    } else {
      res.status(503).json({
        error: 'Controller offline',
        message: 'Controller is not connected via WebSocket'
      });
    }

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * GET /api/controllers/:controllerId/gui/sync/history
 * Get sync history
 */
router.get('/sync/history', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { limit = 20 } = req.query;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const result = await pool.query(
      `SELECT
         id,
         version_number,
         status,
         started_at,
         completed_at,
         duration_ms,
         files_synced,
         error_message
       FROM sync_history
       WHERE controller_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [controllerId, limit]
    );

    res.json({ history: result.rows });

  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

/**
 * POST /api/controllers/:controllerId/gui/discard
 * Discard draft changes (revert to deployed)
 */
router.post('/discard', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const result = await fileManager.discardDraftChanges(controllerId);

    res.json({
      message: 'Draft changes discarded',
      filesReverted: result.filesReverted
    });

  } catch (error) {
    console.error('Discard error:', error);
    res.status(500).json({ error: 'Failed to discard changes' });
  }
});

/**
 * POST /api/controllers/:controllerId/gui/rollback
 * Rollback to a previous version
 */
router.post('/rollback', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'version is required'
      });
    }

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const result = await fileManager.rollbackToVersion(controllerId, version);

    res.json({
      message: 'Rolled back to version',
      version: result.version,
      filesRestored: result.filesRestored
    });

  } catch (error) {
    console.error('Rollback error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Version not found',
        message: error.message
      });
    }

    res.status(500).json({ error: 'Rollback failed' });
  }
});

/**
 * GET /api/controllers/:controllerId/gui/versions
 * Get version history
 */
router.get('/versions', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { limit = 20 } = req.query;

    // Verify controller ownership
    const controllerCheck = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [controllerId, integrator_id]
    );

    if (controllerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const versions = await fileManager.getVersionHistory(controllerId, limit);

    res.json({ versions });

  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to get version history' });
  }
});

module.exports = router;
