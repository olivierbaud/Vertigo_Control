#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Verifies all components of the AI system are working
 */

const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

async function testEnvironmentVariables() {
  section('1. Environment Variables');

  const required = {
    'DATABASE_URL': process.env.DATABASE_URL,
    'JWT_SECRET': process.env.JWT_SECRET,
    'ENCRYPTION_KEY': process.env.ENCRYPTION_KEY
  };

  const aiKeys = {
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
    'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY
  };

  let allGood = true;

  // Check required
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      log(`✓ ${key}: Set`, 'green');
    } else {
      log(`✗ ${key}: Missing`, 'red');
      allGood = false;
    }
  }

  // Check AI keys (at least one required)
  let hasAiKey = false;
  for (const [key, value] of Object.entries(aiKeys)) {
    if (value) {
      log(`✓ ${key}: Set`, 'green');
      hasAiKey = true;
    } else {
      log(`- ${key}: Not set (optional)`, 'gray');
    }
  }

  if (!hasAiKey) {
    log('✗ No AI provider keys found! At least one is required.', 'red');
    allGood = false;
  }

  return allGood;
}

async function testModuleImports() {
  section('2. Module Imports');

  const modules = [
    'src/routes/ai.js',
    'src/ai/provider-factory.js',
    'src/ai/context.js',
    'src/ai/validator.js',
    'src/ai/file-manager.js',
    'src/ai/encryption.js',
    'src/ai/providers/base.js',
    'src/ai/providers/claude.js',
    'src/ai/providers/openai.js',
    'src/ai/providers/gemini.js'
  ];

  let allGood = true;

  for (const module of modules) {
    try {
      require(path.join(__dirname, module));
      log(`✓ ${module}`, 'green');
    } catch (error) {
      log(`✗ ${module}: ${error.message}`, 'red');
      allGood = false;
    }
  }

  return allGood;
}

async function testEncryption() {
  section('3. Encryption System');

  try {
    const encryption = require('./src/ai/encryption');

    if (!encryption.isEnabled()) {
      log('✗ Encryption not enabled (ENCRYPTION_KEY missing or invalid)', 'red');
      return false;
    }

    log('✓ Encryption module enabled', 'green');

    // Test encryption/decryption
    const testKey = 'sk-test-1234567890';
    const encrypted = encryption.encrypt(testKey);
    log(`✓ Encrypted test key: ${encrypted.substring(0, 40)}...`, 'green');

    const decrypted = encryption.decrypt(encrypted);
    if (decrypted === testKey) {
      log('✓ Decryption successful', 'green');
    } else {
      log('✗ Decryption failed: keys do not match', 'red');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Encryption test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testProviderFactory() {
  section('4. Provider Factory');

  try {
    const providerFactory = require('./src/ai/provider-factory');
    log('✓ Provider factory loaded', 'green');

    // Test provider classes
    const providers = ['claude', 'openai', 'gemini'];
    for (const provider of providers) {
      const hasKey = process.env[`${provider.toUpperCase()}_API_KEY`] ||
                    process.env[`ANTHROPIC_API_KEY`] && provider === 'claude';

      if (hasKey) {
        log(`✓ ${provider} provider available`, 'green');
      } else {
        log(`- ${provider} provider: No API key`, 'gray');
      }
    }

    return true;
  } catch (error) {
    log(`✗ Provider factory test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testContextBuilder() {
  section('5. Context Builder');

  try {
    const contextBuilder = require('./src/ai/context');
    log('✓ Context builder loaded', 'green');

    // Check methods exist
    const methods = ['buildContext', 'buildLightContext', 'formatForAI'];
    for (const method of methods) {
      if (typeof contextBuilder[method] === 'function') {
        log(`✓ Method: ${method}()`, 'green');
      } else {
        log(`✗ Missing method: ${method}()`, 'red');
        return false;
      }
    }

    return true;
  } catch (error) {
    log(`✗ Context builder test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendDependencies() {
  section('6. Frontend Dependencies');

  try {
    const fs = require('fs');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'frontend', 'package.json'), 'utf8')
    );

    const required = {
      'react-markdown': packageJson.dependencies['react-markdown'],
      'rehype-highlight': packageJson.dependencies['rehype-highlight']
    };

    let allGood = true;
    for (const [pkg, version] of Object.entries(required)) {
      if (version) {
        log(`✓ ${pkg}: ${version}`, 'green');
      } else {
        log(`✗ ${pkg}: Not installed`, 'red');
        allGood = false;
      }
    }

    return allGood;
  } catch (error) {
    log(`✗ Frontend check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendComponent() {
  section('7. Frontend Component');

  try {
    const fs = require('fs');
    const componentPath = path.join(__dirname, 'frontend', 'src', 'components', 'AiChat.jsx');

    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');

      // Check for key features
      const features = {
        'ReactMarkdown': content.includes('ReactMarkdown'),
        'rehype-highlight': content.includes('rehype-highlight'),
        'Dark mode support': content.includes('dark:'),
        'Provider selection': content.includes('setProvider'),
        'Message state': content.includes('messages'),
        'API integration': content.includes('/api/controllers')
      };

      let allGood = true;
      for (const [feature, present] of Object.entries(features)) {
        if (present) {
          log(`✓ ${feature}`, 'green');
        } else {
          log(`✗ ${feature}: Missing`, 'red');
          allGood = false;
        }
      }

      return allGood;
    } else {
      log('✗ AiChat.jsx not found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Component check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabaseSchema() {
  section('8. Database Schema');

  try {
    const pool = require('./src/db/connection');

    const tables = [
      'ai_usage',
      'ai_api_keys',
      'ai_metrics',
      'gui_files',
      'gui_file_versions'
    ];

    let allGood = true;
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        log(`✓ Table: ${table}`, 'green');
      } else {
        log(`✗ Table: ${table} missing`, 'red');
        allGood = false;
      }
    }

    await pool.end();
    return allGood;
  } catch (error) {
    log(`✗ Database check failed: ${error.message}`, 'red');
    log(`  Hint: Make sure DATABASE_URL is correct and database is running`, 'yellow');
    return false;
  }
}

async function runAllTests() {
  console.clear();
  log('\n🤖 AI Integration Test Suite\n', 'blue');

  const results = {
    'Environment Variables': await testEnvironmentVariables(),
    'Module Imports': await testModuleImports(),
    'Encryption System': await testEncryption(),
    'Provider Factory': await testProviderFactory(),
    'Context Builder': await testContextBuilder(),
    'Frontend Dependencies': await testFrontendDependencies(),
    'Frontend Component': await testFrontendComponent(),
    'Database Schema': await testDatabaseSchema()
  };

  // Summary
  section('Test Summary');

  let passed = 0;
  let failed = 0;

  for (const [test, result] of Object.entries(results)) {
    if (result) {
      log(`✓ ${test}`, 'green');
      passed++;
    } else {
      log(`✗ ${test}`, 'red');
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    log(`\n🎉 All tests passed! (${passed}/${passed})`, 'green');
    log('\nYour AI integration is ready to use!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Start the backend: npm start', 'gray');
    log('2. Start the frontend: cd frontend && npm run dev', 'gray');
    log('3. Navigate to a controller and click the "AI Chat" tab', 'gray');
    console.log();
    process.exit(0);
  } else {
    log(`\n⚠️  ${failed} test(s) failed. (${passed}/${passed + failed} passed)`, 'red');
    log('\nPlease fix the issues above before using AI features.', 'yellow');
    log('See AI_INTEGRATION_SETUP.md for detailed setup instructions.', 'yellow');
    console.log();
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
