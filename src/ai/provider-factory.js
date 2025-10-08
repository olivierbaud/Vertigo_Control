const pool = require('../db/connection');
const encryption = require('./encryption');
const ClaudeProvider = require('./providers/claude');
const OpenAIProvider = require('./providers/openai');
const GeminiProvider = require('./providers/gemini');

/**
 * ProviderFactory
 * Creates AI provider instances with BYOK support
 *
 * Priority:
 * 1. User's BYOK key (encrypted in database)
 * 2. Platform key (from environment)
 * 3. Error if neither available
 */
class ProviderFactory {
  constructor() {
    // Platform keys from environment
    this.platformKeys = {
      claude: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY
    };

    // Provider class mapping
    this.providers = {
      claude: ClaudeProvider,
      openai: OpenAIProvider,
      gemini: GeminiProvider
    };
  }

  /**
   * Get an AI provider instance
   *
   * @param {string} providerName - 'claude', 'openai', or 'gemini'
   * @param {string} integratorId - Integrator ID (for BYOK lookup)
   * @param {Object} config - Additional config (model, temperature, etc.)
   * @returns {Promise<BaseAIProvider>} - Provider instance
   */
  async getProvider(providerName, integratorId, config = {}) {
    // Normalize provider name
    const provider = providerName.toLowerCase();

    // Check if provider exists
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${providerName}. Available: claude, openai, gemini`);
    }

    // Try to get BYOK key first
    let apiKey = await this.getBYOKKey(provider, integratorId);

    // Fall back to platform key
    if (!apiKey) {
      apiKey = this.platformKeys[provider];
    }

    // Error if no key available
    if (!apiKey) {
      throw new Error(
        `No API key available for ${providerName}. ` +
        `Either add a platform key (environment variable) or configure BYOK.`
      );
    }

    // Create provider instance
    const ProviderClass = this.providers[provider];
    return new ProviderClass(apiKey, config);
  }

  /**
   * Get BYOK (Bring Your Own Key) from database
   *
   * @param {string} provider - Provider name
   * @param {string} integratorId - Integrator ID
   * @returns {Promise<string|null>} - Decrypted API key or null
   */
  async getBYOKKey(provider, integratorId) {
    try {
      const result = await pool.query(
        `SELECT api_key_encrypted FROM ai_api_keys
         WHERE integrator_id = $1 AND provider = $2`,
        [integratorId, provider]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const encryptedKey = result.rows[0].api_key_encrypted;
      const decryptedKey = encryption.decrypt(encryptedKey);

      // Update last_used_at
      await pool.query(
        `UPDATE ai_api_keys SET last_used_at = NOW()
         WHERE integrator_id = $1 AND provider = $2`,
        [integratorId, provider]
      );

      return decryptedKey;

    } catch (error) {
      console.error('BYOK key retrieval error:', error);
      return null;
    }
  }

  /**
   * Save a BYOK key for an integrator
   *
   * @param {string} provider - Provider name
   * @param {string} integratorId - Integrator ID
   * @param {string} apiKey - Plain text API key (will be encrypted)
   * @returns {Promise<boolean>} - Success
   */
  async saveBYOKKey(provider, integratorId, apiKey) {
    try {
      // Validate provider
      if (!this.providers[provider]) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Encrypt the API key
      const encryptedKey = encryption.encrypt(apiKey);

      // Save to database
      await pool.query(
        `INSERT INTO ai_api_keys (integrator_id, provider, api_key_encrypted)
         VALUES ($1, $2, $3)
         ON CONFLICT (integrator_id, provider)
         DO UPDATE SET api_key_encrypted = $3, created_at = NOW()`,
        [integratorId, provider, encryptedKey]
      );

      console.log(`✓ BYOK key saved for ${provider} (integrator: ${integratorId})`);
      return true;

    } catch (error) {
      console.error('BYOK key save error:', error);
      throw new Error(`Failed to save BYOK key: ${error.message}`);
    }
  }

  /**
   * Delete a BYOK key
   *
   * @param {string} provider - Provider name
   * @param {string} integratorId - Integrator ID
   * @returns {Promise<boolean>} - Success
   */
  async deleteBYOKKey(provider, integratorId) {
    try {
      const result = await pool.query(
        `DELETE FROM ai_api_keys
         WHERE integrator_id = $1 AND provider = $2`,
        [integratorId, provider]
      );

      return result.rowCount > 0;

    } catch (error) {
      console.error('BYOK key deletion error:', error);
      throw new Error(`Failed to delete BYOK key: ${error.message}`);
    }
  }

  /**
   * List available providers and their status
   *
   * @param {string} integratorId - Integrator ID
   * @returns {Promise<Array>} - Provider info
   */
  async listProviders(integratorId) {
    const providers = [];

    for (const [name, ProviderClass] of Object.entries(this.providers)) {
      // Check BYOK key
      const hasBYOK = await this.hasBYOKKey(name, integratorId);

      // Check platform key
      const hasPlatform = !!this.platformKeys[name];

      // Create temporary instance to get info
      const tempProvider = hasPlatform
        ? new ProviderClass(this.platformKeys[name])
        : null;

      providers.push({
        name,
        available: hasBYOK || hasPlatform,
        hasBYOK,
        hasPlatform,
        info: tempProvider ? tempProvider.getInfo() : null
      });
    }

    return providers;
  }

  /**
   * Check if integrator has BYOK key for provider
   *
   * @param {string} provider - Provider name
   * @param {string} integratorId - Integrator ID
   * @returns {Promise<boolean>}
   */
  async hasBYOKKey(provider, integratorId) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM ai_api_keys
         WHERE integrator_id = $1 AND provider = $2`,
        [integratorId, provider]
      );

      return result.rows.length > 0;

    } catch (error) {
      console.error('BYOK check error:', error);
      return false;
    }
  }

  /**
   * Track AI usage for billing/rate limiting
   *
   * @param {string} integratorId - Integrator ID
   * @param {string} provider - Provider name
   * @param {string} requestType - 'gui_generation', 'chat', etc.
   * @param {number} tokensUsed - Total tokens
   * @param {number} costUsd - Cost in USD
   * @returns {Promise<void>}
   */
  async trackUsage(integratorId, provider, requestType, tokensUsed, costUsd) {
    try {
      await pool.query(
        `INSERT INTO ai_usage (integrator_id, provider, request_type, tokens_used, cost_usd)
         VALUES ($1, $2, $3, $4, $5)`,
        [integratorId, provider, requestType, tokensUsed, costUsd]
      );
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't throw - tracking failure shouldn't break the request
    }
  }

  /**
   * Get usage statistics for an integrator
   *
   * @param {string} integratorId - Integrator ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} - Usage stats
   */
  async getUsageStats(integratorId, days = 30) {
    try {
      const result = await pool.query(
        `SELECT
           provider,
           COUNT(*) as request_count,
           SUM(tokens_used) as total_tokens,
           SUM(cost_usd) as total_cost
         FROM ai_usage
         WHERE integrator_id = $1
           AND created_at > NOW() - INTERVAL '${days} days'
         GROUP BY provider
         ORDER BY total_cost DESC`,
        [integratorId]
      );

      const byProvider = {};
      let totalCost = 0;
      let totalTokens = 0;
      let totalRequests = 0;

      for (const row of result.rows) {
        byProvider[row.provider] = {
          requests: parseInt(row.request_count),
          tokens: parseInt(row.total_tokens),
          cost: parseFloat(row.total_cost)
        };
        totalCost += parseFloat(row.total_cost);
        totalTokens += parseInt(row.total_tokens);
        totalRequests += parseInt(row.request_count);
      }

      return {
        period: `Last ${days} days`,
        totalRequests,
        totalTokens,
        totalCost,
        byProvider
      };

    } catch (error) {
      console.error('Usage stats error:', error);
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }
}

module.exports = new ProviderFactory();
