const express = require('express');
const crypto = require('crypto');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * GET /api/projects/:projectId/controllers
 * Get all controllers for a project
 */
router.get('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { projectId } = req.params;
    
    // Verify project ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND integrator_id = $2',
      [projectId, integrator_id]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await pool.query(
      `SELECT id, name, connection_key, last_seen, status, ip_address, created_at
       FROM controllers 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
      [projectId]
    );
    
    res.json({ controllers: result.rows });
    
  } catch (error) {
    console.error('Get controllers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/controllers
 * Register new controller
 */
router.post('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { projectId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Controller name is required' 
      });
    }
    
    // Verify project ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND integrator_id = $2',
      [projectId, integrator_id]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Generate secure connection key
    const connection_key = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(
      `INSERT INTO controllers (project_id, name, connection_key) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, connection_key, status, created_at`,
      [projectId, name, connection_key]
    );
    
    res.status(201).json({ 
      message: 'Controller registered',
      controller: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;