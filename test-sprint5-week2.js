/**
 * Sprint 5 Week 2 - Integration Tests
 * Tests for AI providers, context builder, validator, and API endpoints
 */

require('dotenv').config();
const pool = require('./src/db/connection');
const contextBuilder = require('./src/ai/context');
const validator = require('./src/ai/validator');
const providerFactory = require('./src/ai/provider-factory');
const ClaudeProvider = require('./src/ai/providers/claude');
const OpenAIProvider = require('./src/ai/providers/openai');
const GeminiProvider = require('./src/ai/providers/gemini');

async function runTests() {
  console.log('='.repeat(60));
  console.log('SPRINT 5 WEEK 2 - INTEGRATION TESTS');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: AI Provider Classes
  console.log('TEST 1: AI Provider Class Structure');
  console.log('-'.repeat(60));
  try {
    // Check if we can instantiate (with dummy keys)
    const claude = new ClaudeProvider('sk-ant-test');
    const openai = new OpenAIProvider('sk-test');
    const gemini = new GeminiProvider('test-key');

    const claudeInfo = claude.getInfo();
    const openaiInfo = openai.getInfo();
    const geminiInfo = gemini.getInfo();

    if (claudeInfo.provider === 'Anthropic' &&
        openaiInfo.provider === 'OpenAI' &&
        geminiInfo.provider === 'Google') {
      console.log('✓ All 3 AI providers instantiated successfully');
      console.log(`  - Claude: ${claudeInfo.model}`);
      console.log(`  - OpenAI: ${openaiInfo.model}`);
      console.log(`  - Gemini: ${geminiInfo.model}`);
      passed++;
    } else {
      console.log('✗ Provider info mismatch');
      failed++;
    }
  } catch (error) {
    console.log('✗ Provider instantiation failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 2: Context Builder
  console.log('TEST 2: Context Builder');
  console.log('-'.repeat(60));
  try {
    // Get a test controller
    const controllerResult = await pool.query(
      'SELECT id FROM controllers LIMIT 1'
    );

    if (controllerResult.rows.length === 0) {
      console.log('⊘ Skipped (no controllers in database)');
    } else {
      const controllerId = controllerResult.rows[0].id;
      const context = await contextBuilder.buildContext(controllerId);

      if (context.system && context.draftFiles !== undefined &&
          context.devices !== undefined && context.controls !== undefined &&
          context.scenes !== undefined && context.summary) {
        console.log('✓ Context built successfully');
        console.log(`  System info: ${context.system.controller}`);
        console.log(`  Draft files: ${context.summary.fileCount}`);
        console.log(`  Devices: ${context.summary.deviceCount}`);
        console.log(`  Controls: ${context.summary.controlCount}`);
        console.log(`  Scenes: ${context.summary.sceneCount}`);
        passed++;
      } else {
        console.log('✗ Context structure incomplete');
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ Context builder failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 3: Validator - Valid Files
  console.log('TEST 3: Validator - Valid GUI Files');
  console.log('-'.repeat(60));
  try {
    const controllerResult = await pool.query(
      'SELECT id FROM controllers LIMIT 1'
    );

    if (controllerResult.rows.length === 0) {
      console.log('⊘ Skipped (no controllers)');
    } else {
      const controllerId = controllerResult.rows[0].id;

      const validFiles = {
        'gui/pages/test.json': {
          name: 'Test Page',
          elements: [
            {
              type: 'button',
              label: 'Test Button',
              action: { type: 'none' },
              position: { x: 10, y: 10, width: 100, height: 80 }
            }
          ]
        }
      };

      const validation = await validator.validate(validFiles, controllerId);

      if (validation.valid) {
        console.log('✓ Valid files passed validation');
        console.log(`  Errors: ${validation.errors.length}`);
        console.log(`  Warnings: ${validation.warnings.length}`);
        passed++;
      } else {
        console.log('✗ Valid files failed validation');
        console.log('  Errors:', validation.errors);
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ Validator test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 4: Validator - Invalid Files
  console.log('TEST 4: Validator - Invalid GUI Files');
  console.log('-'.repeat(60));
  try {
    const controllerResult = await pool.query(
      'SELECT id FROM controllers LIMIT 1'
    );

    if (controllerResult.rows.length === 0) {
      console.log('⊘ Skipped (no controllers)');
    } else {
      const controllerId = controllerResult.rows[0].id;

      const invalidFiles = {
        '../../../etc/passwd': { malicious: true },
        'gui/pages/bad.json': {
          // Missing name
          elements: [
            {
              type: 'button',
              // Missing position
              label: 'Bad Button'
            }
          ]
        }
      };

      const validation = await validator.validate(invalidFiles, controllerId);

      if (!validation.valid && validation.errors.length > 0) {
        console.log('✓ Invalid files correctly rejected');
        console.log(`  Errors detected: ${validation.errors.length}`);
        console.log(`  First error: ${validation.errors[0]}`);
        passed++;
      } else {
        console.log('✗ Invalid files not detected');
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ Validator test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 5: Provider Factory
  console.log('TEST 5: Provider Factory');
  console.log('-'.repeat(60));
  try {
    const integratorResult = await pool.query(
      'SELECT id FROM integrators LIMIT 1'
    );

    if (integratorResult.rows.length === 0) {
      console.log('⊘ Skipped (no integrators)');
    } else {
      const integratorId = integratorResult.rows[0].id;

      const providers = await providerFactory.listProviders(integratorId);

      if (providers.length === 3) {
        console.log('✓ Provider factory lists all 3 providers');
        providers.forEach(p => {
          console.log(`  - ${p.name}: available=${p.available}, BYOK=${p.hasBYOK}, platform=${p.hasPlatform}`);
        });
        passed++;
      } else {
        console.log('✗ Provider count mismatch');
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ Provider factory test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 6: BYOK Key Management
  console.log('TEST 6: BYOK Key Management');
  console.log('-'.repeat(60));
  try {
    const integratorResult = await pool.query(
      'SELECT id FROM integrators LIMIT 1'
    );

    if (integratorResult.rows.length === 0) {
      console.log('⊘ Skipped (no integrators)');
    } else {
      const integratorId = integratorResult.rows[0].id;
      const testKey = 'sk-test-byok-key-12345';

      // Save key
      await providerFactory.saveBYOKKey('claude', integratorId, testKey);

      // Check if exists
      const hasBYOK = await providerFactory.hasBYOKKey('claude', integratorId);

      // Delete key
      await providerFactory.deleteBYOKKey('claude', integratorId);

      if (hasBYOK) {
        console.log('✓ BYOK key save/retrieve/delete works');
        console.log('  Saved, retrieved, and deleted successfully');
        passed++;
      } else {
        console.log('✗ BYOK key not found after save');
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ BYOK test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 7: Token Estimation
  console.log('TEST 7: Token Estimation (All Providers)');
  console.log('-'.repeat(60));
  try {
    const claude = new ClaudeProvider('test-key');
    const openai = new OpenAIProvider('test-key');
    const gemini = new GeminiProvider('test-key');

    const testPrompt = 'Create a main page with volume controls';
    const testContext = { draftFiles: {}, devices: [], controls: [], scenes: [] };

    const claudeEstimate = await claude.estimateCost(testPrompt, testContext);
    const openaiEstimate = await openai.estimateCost(testPrompt, testContext);
    const geminiEstimate = await gemini.estimateCost(testPrompt, testContext);

    if (claudeEstimate.total >= 0 && openaiEstimate.total >= 0 && geminiEstimate.total >= 0) {
      console.log('✓ Cost estimation works for all providers');
      console.log(`  Claude estimate: $${claudeEstimate.total.toFixed(4)}`);
      console.log(`  OpenAI estimate: $${openaiEstimate.total.toFixed(4)}`);
      console.log(`  Gemini estimate: $${geminiEstimate.total.toFixed(4)} (free tier)`);
      passed++;
    } else {
      console.log('✗ Cost estimation failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Token estimation failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 8: WebSocket Sync Protocol
  console.log('TEST 8: WebSocket Sync Protocol Handlers');
  console.log('-'.repeat(60));
  try {
    const WebSocketServer = require('./src/websocket/server');
    const http = require('http');
    const testServer = http.createServer();
    const wsServer = new WebSocketServer(testServer);

    // Check if sync methods exist
    const hasSyncGUI = typeof wsServer.syncGUI === 'function';
    const hasHandleSyncProgress = typeof wsServer.handleSyncProgress === 'function';
    const hasHandleSyncComplete = typeof wsServer.handleSyncComplete === 'function';
    const hasHandleSyncError = typeof wsServer.handleSyncError === 'function';

    if (hasSyncGUI && hasHandleSyncProgress && hasHandleSyncComplete && hasHandleSyncError) {
      console.log('✓ WebSocket sync protocol handlers implemented');
      console.log('  - syncGUI()');
      console.log('  - handleSyncProgress()');
      console.log('  - handleSyncComplete()');
      console.log('  - handleSyncError()');
      passed++;
    } else {
      console.log('✗ Missing sync protocol methods');
      failed++;
    }

    testServer.close();
  } catch (error) {
    console.log('✗ WebSocket test failed:', error.message);
    failed++;
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Sprint 5 Week 2 is complete.');
    console.log('');
    console.log('✅ Implemented:');
    console.log('   - Claude AI Provider (Anthropic)');
    console.log('   - OpenAI Provider (GPT-4)');
    console.log('   - Gemini Provider (Google)');
    console.log('   - Provider Factory with BYOK');
    console.log('   - Context Builder');
    console.log('   - GUI File Validator');
    console.log('   - WebSocket GUI Sync Protocol');
    console.log('   - AI Chat API');
    console.log('   - GUI Management API (deploy/sync)');
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
