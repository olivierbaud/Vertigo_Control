/**
 * Sprint 5 Week 1 - Integration Tests
 * Tests for database, file manager, encryption, and AI infrastructure
 */

require('dotenv').config();
const pool = require('./src/db/connection');
const fileManager = require('./src/ai/file-manager');
const encryption = require('./src/ai/encryption');
const BaseAIProvider = require('./src/ai/providers/base');

async function runTests() {
  console.log('='.repeat(60));
  console.log('SPRINT 5 WEEK 1 - INTEGRATION TESTS');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;
  let testControllerId = null;

  // Test 1: Database Tables
  console.log('TEST 1: Database Tables');
  console.log('-'.repeat(60));
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
      AND (table_name LIKE 'gui%' OR table_name LIKE 'ai%' OR table_name = 'images' OR table_name = 'sync_history')
      ORDER BY table_name
    `);

    const expectedTables = [
      'ai_api_keys',
      'ai_metrics',
      'ai_usage',
      'gui_file_versions',
      'gui_files',
      'images',
      'sync_history'
    ];

    const actualTables = result.rows.map(r => r.table_name);
    const allPresent = expectedTables.every(t => actualTables.includes(t));

    if (allPresent) {
      console.log('✓ All 7 tables created successfully:');
      actualTables.forEach(t => console.log(`  - ${t}`));
      passed++;
    } else {
      console.log('✗ Missing tables:');
      expectedTables.forEach(t => {
        if (!actualTables.includes(t)) {
          console.log(`  - ${t} (MISSING)`);
        }
      });
      failed++;
    }
  } catch (error) {
    console.log('✗ Database test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 2: GUIFileManager - Write Draft File
  console.log('TEST 2: GUIFileManager - Write Draft File');
  console.log('-'.repeat(60));
  try {
    // Create a test controller first
    const controllerResult = await pool.query(`
      INSERT INTO integrators (name, email, password_hash)
      VALUES ('Test Integrator', 'test@test.com', 'hash')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `);
    const integratorId = controllerResult.rows[0].id;

    const projectResult = await pool.query(`
      INSERT INTO projects (integrator_id, name)
      VALUES ($1, 'Test Project')
      RETURNING id
    `, [integratorId]);
    const projectId = projectResult.rows[0].id;

    const testController = await pool.query(`
      INSERT INTO controllers (project_id, name, connection_key)
      VALUES ($1, 'Test Controller Sprint5', 'test-key-sprint5-${Date.now()}')
      ON CONFLICT (connection_key) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [projectId]);

    const controllerId = testController.rows[0]?.id || (await pool.query(
      'SELECT id FROM controllers WHERE name = $1 LIMIT 1',
      ['Test Controller Sprint5']
    )).rows[0].id;

    testControllerId = controllerId;

    // Write a draft file
    const testFile = {
      type: 'page',
      name: 'Main Page',
      elements: [
        { type: 'button', label: 'Test Button' }
      ]
    };

    await fileManager.writeDraftFile(
      controllerId,
      'gui/pages/test.json',
      testFile,
      'test-script'
    );

    // Read it back
    const readFile = await fileManager.readFile(controllerId, 'gui/pages/test.json', 'draft');

    if (readFile && readFile.type === 'page' && readFile.name === 'Main Page') {
      console.log('✓ Draft file written and read successfully');
      console.log('  File path: gui/pages/test.json');
      console.log('  Content:', JSON.stringify(readFile, null, 2).split('\n').slice(0, 3).join('\n'), '...');
      passed++;
    } else {
      console.log('✗ File content mismatch');
      failed++;
    }
  } catch (error) {
    console.log('✗ File manager test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 3: GUIFileManager - Deploy Files
  console.log('TEST 3: GUIFileManager - Deploy Draft to Deployed');
  console.log('-'.repeat(60));
  try {
    const controllerId = testControllerId;

    const result = await fileManager.deployDraftFiles(controllerId, 'test-user', 'Test deployment');

    if (result.version === 1 && result.filesDeployed > 0) {
      console.log('✓ Files deployed successfully');
      console.log(`  Version: ${result.version}`);
      console.log(`  Files deployed: ${result.filesDeployed}`);
      passed++;
    } else {
      console.log('✗ Deployment failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Deploy test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 4: GUIFileManager - Get Status
  console.log('TEST 4: GUIFileManager - Get Status');
  console.log('-'.repeat(60));
  try {
    const controllerId = testControllerId;

    const status = await fileManager.getStatus(controllerId);

    if (status && typeof status.deployedVersion === 'number') {
      console.log('✓ Status retrieved successfully');
      console.log(`  Draft files: ${status.draftFileCount}`);
      console.log(`  Deployed files: ${status.deployedFileCount}`);
      console.log(`  Deployed version: ${status.deployedVersion}`);
      console.log(`  Live version: ${status.liveVersion || 'none'}`);
      console.log(`  Needs sync: ${status.needsSync}`);
      passed++;
    } else {
      console.log('✗ Status check failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Status test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 5: Encryption
  console.log('TEST 5: BYOK Encryption');
  console.log('-'.repeat(60));
  try {
    const testApiKey = 'sk-ant-test-key-12345';
    const encrypted = encryption.encrypt(testApiKey);
    const decrypted = encryption.decrypt(encrypted);

    if (decrypted === testApiKey && encrypted !== testApiKey) {
      console.log('✓ Encryption/decryption works');
      console.log(`  Original: ${testApiKey}`);
      console.log(`  Encrypted: ${encrypted.substring(0, 50)}...`);
      console.log(`  Decrypted: ${decrypted}`);
      console.log(`  Masked: ${encryption.constructor.maskKey(testApiKey)}`);
      passed++;
    } else {
      console.log('✗ Encryption failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Encryption test failed:', error.message);
    failed++;
  }
  console.log('');

  // Test 6: Base Provider Interface
  console.log('TEST 6: Base AI Provider Interface');
  console.log('-'.repeat(60));
  try {
    // Create a mock provider
    class MockProvider extends BaseAIProvider {
      async generateGUIFiles(userPrompt, context) {
        return {
          modifiedFiles: {},
          deletedFiles: [],
          explanation: 'Mock response',
          warnings: []
        };
      }

      async streamResponse(userPrompt, context, onChunk) {
        onChunk('Mock stream');
      }

      async estimateCost(userPrompt, context) {
        return 0.01;
      }
    }

    const provider = new MockProvider('test-key');
    const context = {
      draftFiles: {},
      devices: [],
      controls: [],
      scenes: []
    };

    const systemPrompt = provider.buildSystemPrompt(context);
    const cost = await provider.estimateCost('test prompt', context);

    if (systemPrompt.includes('GUI designer') && cost === 0.01) {
      console.log('✓ Base provider interface works');
      console.log(`  System prompt length: ${systemPrompt.length} chars`);
      console.log(`  Cost estimate: $${cost}`);
      passed++;
    } else {
      console.log('✗ Provider test failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Provider test failed:', error.message);
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
    console.log('🎉 ALL TESTS PASSED! Sprint 5 Week 1 is complete.');
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
