const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * GET /api/controllers/:controllerId/scenes
 * Get all scenes for a controller
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
      `SELECT id, scene_id, name, description, steps, continue_on_error, created_at
       FROM scenes 
       WHERE controller_id = $1 
       ORDER BY created_at DESC`,
      [controllerId]
    );
    
    res.json({ scenes: result.rows });
    
  } catch (error) {
    console.error('Get scenes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/controllers/:controllerId/scenes
 * Create new scene
 */
router.post('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { scene_id, name, description, steps, continue_on_error } = req.body;
    
    // Validation
    if (!scene_id || !name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'scene_id, name, and steps array are required' 
      });
    }
    
    if (steps.length === 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Scene must have at least one step' 
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
      `INSERT INTO scenes (controller_id, scene_id, name, description, steps, continue_on_error) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, scene_id, name, description, steps, continue_on_error, created_at`,
      [controllerId, scene_id, name, description, JSON.stringify(steps), continue_on_error || false]
    );
    
    // Push to WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'scene_added', {
        scene: result.rows[0]
      });
    }
    
    res.status(201).json({ 
      message: 'Scene created',
      scene: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Scene ID already exists for this controller' 
      });
    }
    console.error('Create scene error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/controllers/:controllerId/scenes/:id
 * Get single scene
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    
    const result = await pool.query(
      `SELECT s.id, s.scene_id, s.name, s.description, s.steps, s.continue_on_error, s.created_at
       FROM scenes s
       JOIN controllers c ON s.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE s.id = $1 AND s.controller_id = $2 AND p.integrator_id = $3`,
      [id, controllerId, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    res.json({ scene: result.rows[0] });
    
  } catch (error) {
    console.error('Get scene error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/controllers/:controllerId/scenes/:id
 * Update scene
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    const { name, description, steps, continue_on_error } = req.body;
    
    // Verify ownership
    const check = await pool.query(
      `SELECT s.id FROM scenes s
       JOIN controllers c ON s.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE s.id = $1 AND s.controller_id = $2 AND p.integrator_id = $3`,
      [id, controllerId, integrator_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (steps !== undefined) {
      updates.push(`steps = $${paramCount++}`);
      values.push(JSON.stringify(steps));
    }
    if (continue_on_error !== undefined) {
      updates.push(`continue_on_error = $${paramCount++}`);
      values.push(continue_on_error);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE scenes 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, scene_id, name, description, steps, continue_on_error, created_at`,
      values
    );
    
    // Push to WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'scene_updated', {
        scene: result.rows[0]
      });
    }
    
    res.json({ 
      message: 'Scene updated',
      scene: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Update scene error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/controllers/:controllerId/scenes/:id
 * Delete scene
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM scenes s
       USING controllers c, projects p
       WHERE s.id = $1 AND s.controller_id = $2
       AND c.id = $2 AND p.id = c.project_id AND p.integrator_id = $3
       RETURNING s.id, s.scene_id`,
      [id, controllerId, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Push to WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      wsServer.broadcastConfigUpdate(controllerId, 'scene_deleted', {
        scene_id: result.rows[0].scene_id
      });
    }
    
    res.json({ message: 'Scene deleted' });
    
  } catch (error) {
    console.error('Delete scene error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/controllers/:controllerId/scenes/:id/execute
 * Execute a scene
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId, id } = req.params;
    
    // Verify scene exists and ownership
    const sceneCheck = await pool.query(
      `SELECT s.scene_id FROM scenes s
       JOIN controllers c ON s.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE s.id = $1 AND s.controller_id = $2 AND p.integrator_id = $3`,
      [id, controllerId, integrator_id]
    );
    
    if (sceneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Send execute command via WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      const sent = wsServer.executeScene(controllerId, sceneCheck.rows[0].scene_id);
      
      if (sent) {
        res.json({ message: 'Scene execution triggered' });
      } else {
        res.status(503).json({ 
          error: 'Controller offline',
          message: 'Controller is not connected'
        });
      }
    } else {
      res.status(500).json({ error: 'WebSocket server not available' });
    }
    
  } catch (error) {
    console.error('Execute scene error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;