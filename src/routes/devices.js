const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * GET /api/controllers/:controllerId/devices
 * Get all devices for a controller
 */
router.get('/', async (req, res) => {
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
    
    const result = await pool.query(
      `SELECT id, device_id, name, type, connection_config, status, created_at, updated_at
       FROM devices 
       WHERE controller_id = $1 
       ORDER BY created_at DESC`,
      [controllerId]
    );
    
    res.json({ devices: result.rows });
    
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/controllers/:controllerId/devices
 * Create new device
 */
router.post('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { device_id, name, type, connection_config } = req.body;
    
    // Validation
    if (!device_id || !name || !type) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'device_id, name, and type are required' 
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
    
    const result = await pool.query(
      `INSERT INTO devices (controller_id, device_id, name, type, connection_config) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, device_id, name, type, connection_config, status, created_at`,
      [controllerId, device_id, name, type, connection_config || null]
    );
    
    // Push to WebSocket if controller is connected
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'device_added', {
        device: result.rows[0]
      });
    }
    
    res.status(201).json({ 
      message: 'Device created',
      device: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Device ID already exists for this controller' 
      });
    }
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/controllers/:controllerId/devices/:id
 * Get single device
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    
    const result = await pool.query(
      `SELECT d.id, d.device_id, d.name, d.type, d.connection_config, d.status, d.created_at, d.updated_at
       FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND d.controller_id = $2 AND p.integrator_id = $3`,
      [id, controllerId, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ device: result.rows[0] });
    
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/controllers/:controllerId/devices/:id
 * Update device
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    const { name, type, connection_config, status } = req.body;
    
    // Verify ownership
    const check = await pool.query(
      `SELECT d.id FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND d.controller_id = $2 AND p.integrator_id = $3`,
      [id, controllerId, integrator_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const result = await pool.query(
      `UPDATE devices 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           connection_config = COALESCE($3, connection_config),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING id, device_id, name, type, connection_config, status, created_at, updated_at`,
      [name, type, connection_config, status, id]
    );

    // Push to WebSocket if controller is connected
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'device_updated', {
        device: result.rows[0]
      });
    }
    
    res.json({ 
      message: 'Device updated',
      device: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/controllers/:controllerId/devices/:id
 * Delete device
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM devices d
       USING controllers c, projects p
       WHERE d.id = $1 AND d.controller_id = $2
       AND c.id = $2 AND p.id = c.project_id AND p.integrator_id = $3
       RETURNING d.id`,
      [id, controllerId, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Push to WebSocket if controller is connected
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'device_deleted', {
        device_id: id
      });
    }
    
    res.json({ message: 'Device deleted' });
    
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;