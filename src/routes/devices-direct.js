const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/devices/:id
 * Get single device by ID (direct access)
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.id, d.device_id, d.name, d.type, d.connection_config, d.status, d.created_at, d.updated_at, d.controller_id
       FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND p.integrator_id = $2`,
      [id, integrator_id]
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
 * PUT /api/devices/:id
 * Update device by ID (direct access)
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const { name, type, connection_config, status } = req.body;

    // Verify ownership and get controller_id
    const check = await pool.query(
      `SELECT d.id, d.controller_id FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND p.integrator_id = $2`,
      [id, integrator_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const controllerId = check.rows[0].controller_id;

    const result = await pool.query(
      `UPDATE devices
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           connection_config = COALESCE($3, connection_config),
           status = COALESCE($4, status),
           updated_at = NOW()
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
 * DELETE /api/devices/:id
 * Delete device by ID (direct access)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    // First get the controller_id for WebSocket notification
    const deviceCheck = await pool.query(
      `SELECT d.controller_id FROM devices d
       JOIN controllers c ON d.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE d.id = $1 AND p.integrator_id = $2`,
      [id, integrator_id]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const controllerId = deviceCheck.rows[0].controller_id;

    // Delete the device
    const result = await pool.query(
      `DELETE FROM devices d
       USING controllers c, projects p
       WHERE d.id = $1
       AND c.id = d.controller_id
       AND p.id = c.project_id
       AND p.integrator_id = $2
       RETURNING d.id, d.device_id`,
      [id, integrator_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Push to WebSocket if controller is connected
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'device_deleted', {
        device_id: result.rows[0].device_id
      });
    }

    res.json({ message: 'Device deleted' });

  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
