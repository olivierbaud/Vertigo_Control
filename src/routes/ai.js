const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const pool = require('../db/connection');
const providerFactory = require('../ai/provider-factory');
const contextBuilder = require('../ai/context');
const validator = require('../ai/validator');
const fileManager = require('../ai/file-manager');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

/**
 * POST /api/controllers/:controllerId/ai/chat
 * Chat with AI to generate/modify GUI files
 */
router.post('/chat', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { controllerId } = req.params;
    const { prompt, provider = 'claude', model, temperature } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'prompt is required'
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

    // Build context
    const context = await contextBuilder.buildContext(controllerId);

    // Get AI provider
    const aiProvider = await providerFactory.getProvider(
      provider,
      integrator_id,
      { model, temperature }
    );

    // Generate GUI files
    const result = await aiProvider.generateGUIFiles(prompt, context);

    // Validate generated files
    const validation = await validator.validate(result.modifiedFiles, controllerId);

    // Write to draft files if valid
    if (validation.valid) {
      for (const [filePath, content] of Object.entries(result.modifiedFiles)) {
        await fileManager.writeDraftFile(controllerId, filePath, content, 'ai');
      }

      // Handle deletions
      for (const filePath of result.deletedFiles || []) {
        await fileManager.deleteDraftFile(controllerId, filePath);
      }
    }

    // Track usage
    await providerFactory.trackUsage(
      integrator_id,
      provider,
      'gui_generation',
      result.usage.totalTokens,
      result.usage.cost.total
    );

    res.json({
      success: validation.valid,
      result: {
        modifiedFiles: Object.keys(result.modifiedFiles),
        deletedFiles: result.deletedFiles || [],
        explanation: result.explanation,
        warnings: [...result.warnings, ...validation.warnings],
        errors: validation.errors
      },
      usage: result.usage,
      provider: result.provider,
      model: result.model
    });

  } catch (error) {
    console.error('AI chat error:', error);

    if (error.message.includes('No API key')) {
      return res.status(503).json({
        error: 'AI provider not configured',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'AI generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/controllers/:controllerId/ai/providers
 * List available AI providers
 */
router.get('/providers', async (req, res) => {
  try {
    const { integrator_id } = req.user;

    const providers = await providerFactory.listProviders(integrator_id);

    res.json({ providers });

  } catch (error) {
    console.error('List providers error:', error);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

/**
 * POST /api/ai/keys
 * Save BYOK (Bring Your Own Key) API key
 */
router.post('/keys', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'provider and apiKey are required'
      });
    }

    await providerFactory.saveBYOKKey(provider, integrator_id, apiKey);

    res.json({
      message: 'API key saved successfully',
      provider
    });

  } catch (error) {
    console.error('Save BYOK key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

/**
 * DELETE /api/ai/keys/:provider
 * Delete BYOK API key
 */
router.delete('/keys/:provider', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { provider } = req.params;

    const deleted = await providerFactory.deleteBYOKKey(provider, integrator_id);

    if (deleted) {
      res.json({ message: 'API key deleted successfully' });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }

  } catch (error) {
    console.error('Delete BYOK key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/**
 * GET /api/ai/usage
 * Get AI usage statistics
 */
router.get('/usage', async (req, res) => {
  try {
    const { integrator_id } = req.user;
    const { days = 30 } = req.query;

    const stats = await providerFactory.getUsageStats(integrator_id, parseInt(days));

    res.json({ usage: stats });

  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router;
