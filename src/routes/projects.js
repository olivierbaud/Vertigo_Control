const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/projects
 * Get all projects for authenticated integrator
 */
router.get('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    
    const result = await pool.query(
      `SELECT id, name, customer_name, location, created_at, updated_at
       FROM projects 
       WHERE integrator_id = $1 
       ORDER BY created_at DESC`,
      [integrator_id]
    );
    
    res.json({ projects: result.rows });
    
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { name, customer_name, location } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Project name is required' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO projects (integrator_id, name, customer_name, location) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, customer_name, location, created_at, updated_at`,
      [integrator_id, name, customer_name, location]
    );
    
    res.status(201).json({ 
      message: 'Project created',
      project: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/projects/:id
 * Get single project
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, name, customer_name, location, created_at, updated_at
       FROM projects 
       WHERE id = $1 AND integrator_id = $2`,
      [id, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project: result.rows[0] });
    
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const { name, customer_name, location } = req.body;
    
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND integrator_id = $2',
      [id, integrator_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await pool.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           customer_name = COALESCE($2, customer_name),
           location = COALESCE($3, location)
       WHERE id = $4
       RETURNING id, name, customer_name, location, created_at, updated_at`,
      [name, customer_name, location, id]
    );
    
    res.json({ 
      message: 'Project updated',
      project: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project (and all associated data via CASCADE)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND integrator_id = $2 RETURNING id',
      [id, integrator_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted' });
    
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;