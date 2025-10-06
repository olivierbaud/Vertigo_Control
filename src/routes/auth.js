const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new integrator account
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Name, email, and password are required' 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Password must be at least 8 characters' 
      });
    }
    
    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM integrators WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Email already registered' 
      });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create integrator
    const result = await pool.query(
      `INSERT INTO integrators (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, subscription_tier, status, created_at`,
      [name, email, password_hash]
    );
    
    const integrator = result.rows[0];
    
    // Generate token
    const token = generateToken(integrator);
    
    res.status(201).json({
      message: 'Registration successful',
      integrator: {
        id: integrator.id,
        name: integrator.name,
        email: integrator.email,
        subscription_tier: integrator.subscription_tier,
        status: integrator.status
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login to existing account
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Email and password are required' 
      });
    }
    
    // Find integrator
    const result = await pool.query(
      `SELECT id, name, email, password_hash, subscription_tier, status 
       FROM integrators 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid email or password' 
      });
    }
    
    const integrator = result.rows[0];
    
    // Check if account is active
    if (integrator.status !== 'active') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Account is not active' 
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, integrator.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid email or password' 
      });
    }
    
    // Generate token
    const token = generateToken(integrator);
    
    res.json({
      message: 'Login successful',
      integrator: {
        id: integrator.id,
        name: integrator.name,
        email: integrator.email,
        subscription_tier: integrator.subscription_tier,
        status: integrator.status
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;