const express = require('express');
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/controllers/:id
 * Get single controller by ID (with ownership verification)
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.name, c.connection_key, c.last_seen, c.status, c.ip_address, c.created_at, c.project_id,
              p.name as project_name
       FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [id, integrator_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    res.json({ controller: result.rows[0] });

  } catch (error) {
    console.error('Get controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/controllers/:id
 * Update controller name
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const { name } = req.body;

    // Verify ownership
    const check = await pool.query(
      `SELECT c.id FROM controllers c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.integrator_id = $2`,
      [id, integrator_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    const result = await pool.query(
      `UPDATE controllers
       SET name = COALESCE($1, name), updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, connection_key, status, last_seen, created_at`,
      [name, id]
    );

    res.json({
      message: 'Controller updated',
      controller: result.rows[0]
    });

  } catch (error) {
    console.error('Update controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/controllers/:id
 * Delete controller
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM controllers c
       USING projects p
       WHERE c.id = $1 AND c.project_id = p.id AND p.integrator_id = $2
       RETURNING c.id`,
      [id, integrator_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Controller not found' });
    }

    res.json({ message: 'Controller deleted' });

  } catch (error) {
    console.error('Delete controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
