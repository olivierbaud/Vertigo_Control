/**
 * Device Driver Management Routes
 *
 * Handles CRUD operations for AI-generated device drivers
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const pool = require('../db/connection');
const providerFactory = require('../ai/provider-factory');
const driverGenerator = require('../ai/driver-generator');

const router = express.Router();
router.use(authenticate);

/**
 * POST /api/drivers/generate
 * Generate a new device driver using AI
 */
router.post('/generate', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const {
      name,
      deviceType,
      manufacturer,
      model,
      protocolType,
      connectionConfig,
      description,
      documentation,
      examples,
      provider = 'claude',
      model: aiModel
    } = req.body;

    // Validation
    if (!name || !deviceType || !protocolType) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'name, deviceType, and protocolType are required'
      });
    }

    const validProtocols = ['tcp', 'udp', 'serial', 'http', 'websocket', 'mqtt'];
    if (!validProtocols.includes(protocolType.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid protocol',
        message: `Protocol must be one of: ${validProtocols.join(', ')}`
      });
    }

    // Build context for AI
    const context = {
      protocol_type: protocolType.toLowerCase(),
      description,
      documentation,
      examples,
      connection_config: connectionConfig || {}
    };

    // Get AI provider
    const aiProvider = await providerFactory.getProvider(provider, integrator_id, {
      model: aiModel
    });

    console.log(`Generating driver for ${name} using ${provider}...`);

    // Generate driver code
    const result = await driverGenerator.generateDriver(context, aiProvider);

    // Save to database
    const driverId = await driverGenerator.saveDriver({
      integrator_id,
      name,
      device_type: deviceType,
      manufacturer: manufacturer || 'Unknown',
      model: model || 'Generic',
      protocol_type: protocolType.toLowerCase(),
      connection_config: connectionConfig || {},
      driver_code: result.driverCode,
      commands: result.commands,
      description: description || '',
      ai_prompt: description,
      ai_provider: provider,
      ai_model: aiModel || aiProvider.defaultModel,
      ai_tokens_used: result.usage?.totalTokens || 0,
      ai_cost_usd: result.usage?.cost?.total || 0,
      protocol_notes: result.protocolNotes
    });

    // Track usage
    await providerFactory.trackUsage(
      integrator_id,
      provider,
      'driver_generation',
      result.usage?.totalTokens || 0,
      result.usage?.cost?.total || 0
    );

    res.status(201).json({
      success: true,
      driverId,
      driverCode: result.driverCode,
      className: result.className,
      commands: result.commands,
      explanation: result.explanation,
      protocolNotes: result.protocolNotes,
      dependencies: result.dependencies,
      usage: result.usage
    });

  } catch (error) {
    console.error('Driver generation error:', error);

    if (error.message.includes('No API key')) {
      return res.status(503).json({
        error: 'AI provider not configured',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Driver generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/drivers/save-manual
 * Save a manually provided driver (skip AI generation)
 */
router.post('/save-manual', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const {
      name,
      device_type,
      manufacturer,
      model,
      protocol_type,
      driver_code,
      description,
      connection_config
    } = req.body;

    console.log(`Saving manual driver "${name}" for integrator ${integrator_id}`);
    console.log(`Driver code length: ${driver_code?.length || 0} chars`);

    // Validation
    if (!name || !device_type || !driver_code) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'name, device_type, and driver_code are required'
      });
    }

    // Validate driver code
    const validation = await driverGenerator.validateDriverCode(driver_code);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid driver code',
        message: 'Driver code validation failed',
        details: validation.errors
      });
    }

    // Save to database with validation status
    const driverId = await driverGenerator.saveDriver({
      integrator_id,
      name,
      device_type,
      manufacturer: manufacturer || 'Unknown',
      model: model || 'Generic',
      protocol_type: protocol_type || 'tcp',
      connection_config: connection_config || {},
      driver_code,
      commands: [], // No commands for manual uploads
      description: description || 'Manually uploaded driver',
      ai_prompt: null,
      ai_provider: null,
      ai_model: null,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
      protocol_notes: 'Manually uploaded driver code'
    });

    // Mark driver as validated since it passed validation
    await pool.query(
      'UPDATE device_drivers SET is_validated = true, last_tested_at = NOW() WHERE id = $1',
      [driverId]
    );

    console.log(`Driver ${driverId} saved and validated successfully`);

    res.status(201).json({
      success: true,
      driverId,
      message: 'Driver saved successfully'
    });

  } catch (error) {
    console.error('Save manual driver error:', error);
    res.status(500).json({
      error: 'Failed to save driver',
      message: error.message
    });
  }
});

/**
 * GET /api/drivers
 * List all drivers for the authenticated integrator
 */
router.get('/', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { status, protocol_type, limit = 100 } = req.query;

    const filters = {
      status,
      protocol_type,
      limit: parseInt(limit)
    };

    const drivers = await driverGenerator.listDrivers(integrator_id, filters);

    res.json({ drivers });

  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json({ error: 'Failed to list drivers' });
  }
});

/**
 * GET /api/drivers/:id
 * Get a single driver with commands
 */
router.get('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM device_drivers WHERE id = $1 AND integrator_id = $2',
      [id, integrator_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = await driverGenerator.getDriver(id);

    res.json({ driver });

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Failed to get driver' });
  }
});

/**
 * PUT /api/drivers/:id
 * Update a driver (code, status, etc.)
 */
router.put('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const {
      name,
      description,
      status,
      driver_code,
      connection_config,
      notes
    } = req.body;

    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM device_drivers WHERE id = $1 AND integrator_id = $2',
      [id, integrator_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // If driver_code is being updated, validate it
    if (driver_code) {
      const validation = await driverGenerator.validateDriverCode(driver_code);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid driver code',
          details: validation.errors
        });
      }
    }

    // Update driver
    const result = await pool.query(
      `UPDATE device_drivers
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           driver_code = COALESCE($4, driver_code),
           connection_config = COALESCE($5, connection_config),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7 AND integrator_id = $8
       RETURNING *`,
      [name, description, status, driver_code, connection_config, notes, id, integrator_id]
    );

    res.json({
      message: 'Driver updated successfully',
      driver: result.rows[0]
    });

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

/**
 * DELETE /api/drivers/:id
 * Delete a driver (only if not deployed)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    // Check if driver is deployed
    const deploymentCheck = await pool.query(
      `SELECT COUNT(*) as count FROM driver_deployments
       WHERE driver_id = $1 AND deployment_status = 'active'`,
      [id]
    );

    if (parseInt(deploymentCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete deployed driver',
        message: 'This driver is currently deployed to one or more controllers. Remove deployments first.'
      });
    }

    // Delete driver
    const result = await pool.query(
      'DELETE FROM device_drivers WHERE id = $1 AND integrator_id = $2 RETURNING id',
      [id, integrator_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ message: 'Driver deleted successfully' });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

/**
 * POST /api/drivers/:id/validate
 * Validate driver code syntax and structure
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    console.log(`Validating driver ${id} for integrator ${integrator_id}`);

    // Get driver
    const driverResult = await pool.query(
      'SELECT driver_code FROM device_drivers WHERE id = $1 AND integrator_id = $2',
      [id, integrator_id]
    );

    if (driverResult.rows.length === 0) {
      console.log(`Driver ${id} not found`);
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driverCode = driverResult.rows[0].driver_code;
    console.log(`Driver code length: ${driverCode.length} chars`);
    console.log(`First 100 chars: ${driverCode.substring(0, 100)}`);

    const validation = await driverGenerator.validateDriverCode(driverCode);

    console.log(`Validation result - valid: ${validation.valid}, errors: ${validation.errors.length}, warnings: ${validation.warnings.length}`);
    if (!validation.valid) {
      console.log('Validation errors:', validation.errors);
    }

    // Always return 200 with validation results
    res.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    });

  } catch (error) {
    console.error('Validate driver error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to validate driver', message: error.message });
  }
});

/**
 * POST /api/drivers/:id/test
 * Test driver against a live device
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const {
      testType = 'syntax',
      deviceHost,
      devicePort,
      testCommands
    } = req.body;

    const testRunId = uuidv4();

    // Get driver
    const driver = await driverGenerator.getDriver(id);

    if (!driver || driver.integrator_id !== integrator_id) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const testResults = [];

    // Syntax test
    if (testType === 'syntax' || testType === 'all') {
      const validation = await driverGenerator.validateDriverCode(driver.driver_code);

      await pool.query(
        `INSERT INTO driver_test_results (
          driver_id, test_run_id, test_type, test_status,
          success, error_message, tested_by
        ) VALUES ($1, $2, 'syntax', $3, $4, $5, $6)`,
        [
          id,
          testRunId,
          validation.valid ? 'passed' : 'failed',
          validation.valid,
          validation.errors.join(', ') || null,
          integrator_id
        ]
      );

      testResults.push({
        type: 'syntax',
        passed: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      });

      if (!validation.valid) {
        return res.json({
          testRunId,
          success: false,
          results: testResults
        });
      }
    }

    // Live device test (if requested and device info provided)
    if (testType === 'live_device' && deviceHost && devicePort) {
      // TODO: Implement live device testing
      // This would require safely executing the driver code in a sandboxed environment
      testResults.push({
        type: 'live_device',
        passed: false,
        message: 'Live device testing not yet implemented'
      });
    }

    // Update driver validation status
    await pool.query(
      `UPDATE device_drivers
       SET is_validated = $1, last_tested_at = NOW()
       WHERE id = $2`,
      [testResults.every(r => r.passed), id]
    );

    res.json({
      testRunId,
      success: testResults.every(r => r.passed),
      results: testResults
    });

  } catch (error) {
    console.error('Test driver error:', error);
    res.status(500).json({ error: 'Failed to test driver' });
  }
});

/**
 * POST /api/drivers/:id/deploy
 * Deploy driver to a controller
 */
router.post('/:id/deploy', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const { controllerId } = req.body;

    if (!controllerId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'controllerId is required'
      });
    }

    // Verify driver ownership
    const driver = await driverGenerator.getDriver(id);
    if (!driver || driver.integrator_id !== integrator_id) {
      return res.status(404).json({ error: 'Driver not found' });
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

    // Check if driver is validated
    if (!driver.is_validated) {
      return res.status(400).json({
        error: 'Driver not validated',
        message: 'Please validate and test the driver before deploying'
      });
    }

    const syncId = uuidv4();

    // Create deployment record
    await pool.query(
      `INSERT INTO driver_deployments (
        driver_id, controller_id, deployed_version,
        deployment_status, sync_id, deployed_by
      ) VALUES ($1, $2, $3, 'pending', $4, $5)
      ON CONFLICT (controller_id, driver_id)
      DO UPDATE SET
        deployment_status = 'pending',
        sync_id = $4,
        deployed_at = NOW(),
        deployed_by = $5`,
      [id, controllerId, driver.version, syncId, integrator_id]
    );

    // Send deployment via WebSocket
    const wsServer = req.app.get('wsServer');
    if (wsServer) {
      const sent = wsServer.sendToController(controllerId, {
        type: 'driver_sync',
        timestamp: new Date().toISOString(),
        data: {
          sync_id: syncId,
          driver_id: id,
          driver_type: driver.device_type,
          version: driver.version,
          driver_code: driver.driver_code,
          command_mappings: driver.commands,
          protocol_type: driver.protocol_type,
          connection_config: driver.connection_config
        }
      });

      if (!sent) {
        console.warn(`Failed to send driver to controller ${controllerId} - controller offline`);
      } else {
        console.log(`Driver deployment message sent to controller ${controllerId}`);
      }
    }

    res.json({
      message: 'Driver deployment initiated',
      syncId,
      driverId: id,
      controllerId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Deploy driver error:', error);
    res.status(500).json({ error: 'Failed to deploy driver' });
  }
});

/**
 * GET /api/drivers/:id/deployments
 * Get deployment history for a driver
 */
router.get('/:id/deployments', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;

    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM device_drivers WHERE id = $1 AND integrator_id = $2',
      [id, integrator_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const result = await pool.query(
      `SELECT dd.*, c.name as controller_name, p.name as project_name
       FROM driver_deployments dd
       JOIN controllers c ON dd.controller_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE dd.driver_id = $1
       ORDER BY dd.deployed_at DESC`,
      [id]
    );

    res.json({ deployments: result.rows });

  } catch (error) {
    console.error('Get deployments error:', error);
    res.status(500).json({ error: 'Failed to get deployments' });
  }
});

/**
 * GET /api/drivers/templates
 * Get available driver templates
 */
router.get('/templates/list', async (req, res) => {
  try {
    const { category, manufacturer } = req.query;

    let query = `
      SELECT id, name, manufacturer, device_model, category, template_type,
             description, protocol_type, usage_count, rating
      FROM driver_templates
      WHERE is_published = TRUE
    `;

    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (manufacturer) {
      paramCount++;
      query += ` AND manufacturer ILIKE $${paramCount}`;
      params.push(`%${manufacturer}%`);
    }

    query += ' ORDER BY usage_count DESC, rating DESC NULLS LAST';

    const result = await pool.query(query, params);

    res.json({ templates: result.rows });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * POST /api/drivers/:id/refine
 * Refine driver with AI assistance
 */
router.post('/:id/refine', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { id } = req.params;
    const { refinementPrompt, provider = 'claude' } = req.body;

    if (!refinementPrompt) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'refinementPrompt is required'
      });
    }

    // Get current driver
    const driver = await driverGenerator.getDriver(id);
    if (!driver || driver.integrator_id !== integrator_id) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get AI provider
    const aiProvider = await providerFactory.getProvider(provider, integrator_id);

    // Build refinement prompt
    const prompt = `You have previously generated this device driver:

${driver.driver_code}

The user now requests the following refinement:
${refinementPrompt}

Please provide the updated driver code with the requested changes.
Return ONLY valid JSON with:
{
  "driverCode": "updated code here",
  "explanation": "what was changed"
}`;

    const response = await aiProvider.chat([
      { role: 'system', content: 'You are a driver development assistant. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ]);

    // Parse response
    const cleanedResponse = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(cleanedResponse);

    // Validate refined code
    const validation = await driverGenerator.validateDriverCode(result.driverCode);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Refined driver has errors',
        details: validation.errors
      });
    }

    // Update driver
    await pool.query(
      'UPDATE device_drivers SET driver_code = $1, updated_at = NOW() WHERE id = $2',
      [result.driverCode, id]
    );

    // Track usage
    await providerFactory.trackUsage(
      integrator_id,
      provider,
      'driver_refinement',
      response.usage?.totalTokens || 0,
      response.usage?.cost?.total || 0
    );

    res.json({
      success: true,
      driverCode: result.driverCode,
      explanation: result.explanation,
      usage: response.usage
    });

  } catch (error) {
    console.error('Refine driver error:', error);
    res.status(500).json({ error: 'Failed to refine driver' });
  }
});

module.exports = router;
