const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * GET /api/devices/:deviceId/controls
 * Get all controls for a device
 */
router.get('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { deviceId } = req.params;
    
    // Verify device ownership
    const deviceCheck = await pool.query(
      `SELECT d.id FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND p.integrator_id = $2`,
      [deviceId, integrator_id]
    );
    
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const result = await pool.query(
      `SELECT id, control_id, logical_name, control_type, block_id, parameters, created_at
       FROM device_controls 
       WHERE device_id = $1 
       ORDER BY created_at DESC`,
      [deviceId]
    );
    
    res.json({ controls: result.rows });
    
  } catch (error) {
    console.error('Get controls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/devices/:deviceId/controls
 * Create control mapping
 */
router.post('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { deviceId } = req.params;
    const { control_id, logical_name, control_type, block_id, parameters } = req.body;
    
    // Validation
    if (!control_id || !logical_name || !control_type || !block_id) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'control_id, logical_name, control_type, and block_id are required' 
      });
    }
    
    // Verify device ownership
    const deviceCheck = await pool.query(
      `SELECT d.id, c.id as controller_id FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND p.integrator_id = $2`,
      [deviceId, integrator_id]
    );
    
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const result = await pool.query(
      `INSERT INTO device_controls (device_id, control_id, logical_name, control_type, block_id, parameters) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, control_id, logical_name, control_type, block_id, parameters, created_at`,
      [deviceId, control_id, logical_name, control_type, block_id, parameters || null]
    );
    
    // Push to WebSocket if controller is connected
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(deviceCheck.rows[0].controller_id, 'control_added', {
        device_id: deviceId,
        control: result.rows[0]
      });
    }
    
    res.status(201).json({ 
      message: 'Control mapping created',
      control: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Control ID already exists for this device' 
      });
    }
    console.error('Create control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/devices/:deviceId/controls/:id
 * Update control mapping
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { deviceId, id } = req.params;
    const { logical_name, control_type, block_id, parameters } = req.body;
    
    // Verify ownership
    const check = await pool.query(
      `SELECT dc.id, c.id as controller_id FROM device_controls dc
       JOIN devices d ON dc.device_id = d.id
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE dc.id = $1 AND dc.device_id = $2 AND p.integrator_id = $3`,
      [id, deviceId, integrator_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Control not found' });
    }
    
    const result = await pool.query(
      `UPDATE device_controls 
       SET logical_name = COALESCE($1, logical_name),
           control_type = COALESCE($2, control_type),
           block_id = COALESCE($3, block_id),
           parameters = COALESCE($4, parameters)
       WHERE id = $5
       RETURNING id, control_id, logical_name, control_type, block_id, parameters, created_at`,
      [logical_name, control_type, block_id, parameters, id]
    );
    
    // Push to WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(check.rows[0].controller_id, 'control_updated', {
        device_id: deviceId,
        control: result.rows[0]
      });
    }
    
    res.json({ 
      message: 'Control mapping updated',
      control: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Update control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/devices/:deviceId/controls/:id
 * Delete control mapping
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { deviceId, id } = req.params;
    
    const check = await pool.query(
      `SELECT dc.id, c.id as controller_id FROM device_controls dc
       JOIN devices d ON dc.device_id = d.id
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE dc.id = $1 AND dc.device_id = $2 AND p.integrator_id = $3`,
      [id, deviceId, integrator_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Control not found' });
    }
    
    await pool.query('DELETE FROM device_controls WHERE id = $1', [id]);
    
    // Push to WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(check.rows[0].controller_id, 'control_deleted', {
        device_id: deviceId,
        control_id: id
      });
    }
    
    res.json({ message: 'Control mapping deleted' });
    
  } catch (error) {
    console.error('Delete control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;